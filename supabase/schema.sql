-- =====================================================================
-- AeroGlobETec · Plataforma de proyectos
-- Esquema de Supabase: tablas, permisos (RLS), triggers y almacenamiento.
--
-- Cómo usarlo: en el panel de Supabase, SQL Editor → pegar todo → Run.
-- Se puede volver a correr: borra y recrea las funciones y políticas.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('docente', 'lider', 'estudiante');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('pendiente', 'en_curso', 'en_revision', 'hecha');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.update_status as enum ('pendiente', 'aprobado', 'cambios');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_status as enum ('necesario', 'pedido', 'recibido', 'en_uso');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  avatar_url  text,
  role        public.user_role not null default 'estudiante',
  created_at  timestamptz not null default now()
);

-- Acceso: cada cuenta nueva queda pendiente hasta que un docente o un admin la aprueba
-- (Usuarios → Pedidos de acceso). Las cuentas que ya existían cuando se agregó esto quedan aprobadas.
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'access') then
    alter table public.profiles add column access text not null default 'aprobado'
      check (access in ('pendiente', 'aprobado', 'rechazado'));
    alter table public.profiles alter column access set default 'pendiente';
  end if;
end $$;
alter table public.profiles add column if not exists access_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists access_at timestamptz;

-- Administradores: tienen todos los permisos y pueden dar cualquier rol.
-- Solo se edita desde el SQL Editor de Supabase (no hay permisos de escritura desde la web).
create table if not exists public.admins (
  email     text primary key check (email = lower(email)),
  added_at  timestamptz not null default now()
);

insert into public.admins (email) values ('mal.gimenez@alumno.etec.um.edu.ar')
on conflict (email) do nothing;

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  description  text not null default '',
  color        text not null default '#3774bc',
  archived     boolean not null default false,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
-- Ficha del proyecto (texto con formato simple, lo editan docentes y líderes)
alter table public.projects add column if not exists presentation text not null default '';

create table if not exists public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.areas (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  description  text not null default '',
  color        text not null default '#7caef3',
  created_at   timestamptz not null default now()
);

create table if not exists public.area_members (
  area_id  uuid not null references public.areas(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (area_id, user_id)
);

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  due_date    date not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  area_id       uuid references public.areas(id) on delete set null,
  milestone_id  uuid references public.milestones(id) on delete set null,
  title         text not null check (length(trim(title)) > 0),
  description   text not null default '',
  status        public.task_status not null default 'pendiente',
  priority      smallint not null default 2 check (priority between 1 and 3),
  assignee_id   uuid references public.profiles(id) on delete set null,
  due_date      date,
  completed_at  timestamptz,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Avances que suben los estudiantes
create table if not exists public.updates (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  area_id      uuid references public.areas(id) on delete set null,
  task_id      uuid references public.tasks(id) on delete set null,
  author_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  body         text not null default '',
  attachments  jsonb not null default '[]'::jsonb,  -- [{path, name, size}]
  status       public.update_status not null default 'pendiente',
  score        smallint check (score between 1 and 10),
  feedback     text not null default '',
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  update_id   uuid not null references public.updates(id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);
alter table public.comments add column if not exists mentions uuid[] not null default '{}';

create table if not exists public.project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  path         text not null unique,
  name         text not null,
  size         bigint not null default 0,
  folder       text not null default 'General',
  uploaded_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.inventory (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  quantity        integer not null default 1 check (quantity >= 0),
  unit_cost       numeric(12,2) not null default 0 check (unit_cost >= 0),
  status          public.item_status not null default 'necesario',
  responsible_id  uuid references public.profiles(id) on delete set null,
  link            text not null default '',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

-- Bitácora: la llenan los triggers, nadie escribe a mano
create table if not exists public.activity (
  id          bigint generated always as identity primary key,
  project_id  uuid not null references public.projects(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  kind        text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  message     text not null,
  link        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists updates_project_idx on public.updates(project_id);
create index if not exists updates_author_idx on public.updates(author_id);
create index if not exists activity_project_idx on public.activity(project_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- ---------------------------------------------------------------------
-- Funciones de permisos
-- ---------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p join admins a on a.email = p.email where p.id = auth.uid());
$$;

-- Cuenta habilitada: aprobada por un docente o admin (los admins siempre lo están)
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid()
                 and (p.access = 'aprobado' or exists (select 1 from admins a where a.email = p.email)));
$$;

-- Docentes, estudiantes líderes y admins tienen los mismos permisos en los proyectos
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from profiles where id = auth.uid() and role in ('docente', 'lider') and access = 'aprobado');
$$;

-- Pueden cambiar roles: docentes y admins
create or replace function public.is_docente() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from profiles where id = auth.uid() and role = 'docente' and access = 'aprobado');
$$;

create or replace function public.can_view_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or (public.is_approved() and exists (select 1 from project_members where project_id = p and user_id = auth.uid()));
$$;

-- ---------------------------------------------------------------------
-- Alta de usuarios: solo cuentas de la ETec
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  domain text := lower(split_part(new.email, '@', 2));
  r public.user_role;
  who text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  admin boolean := exists (select 1 from admins where email = lower(new.email));
begin
  if domain = 'etec.um.edu.ar' then
    r := 'docente';
  elsif domain = 'alumno.etec.um.edu.ar' then
    r := 'estudiante';
  else
    raise exception 'Solo se permiten cuentas @etec.um.edu.ar o @alumno.etec.um.edu.ar';
  end if;

  insert into profiles (id, email, full_name, avatar_url, role, access)
  values (new.id, lower(new.email), who, new.raw_user_meta_data->>'avatar_url', r,
          case when admin then 'aprobado' else 'pendiente' end);

  -- Aviso a quienes pueden aprobar
  if not admin then
    insert into notifications (user_id, message, link)
    select p.id, who || ' (' || lower(new.email) || ') pidió entrar a la plataforma', '#/usuarios'
    from profiles p
    where p.id <> new.id and p.access = 'aprobado'
      and (p.role = 'docente' or exists (select 1 from admins a where a.email = p.email));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cuentas creadas antes de cargar este esquema: se les crea el perfil si el dominio es válido
insert into public.profiles (id, email, full_name, avatar_url, role)
select
  u.id,
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url',
  case lower(split_part(u.email, '@', 2)) when 'etec.um.edu.ar' then 'docente' else 'estudiante' end::public.user_role
from auth.users u
where lower(split_part(u.email, '@', 2)) in ('etec.um.edu.ar', 'alumno.etec.um.edu.ar')
on conflict (id) do nothing;

-- Nadie puede cambiarse su propio rol ni su email; los roles los cambia un docente.
-- Un admin puede dar cualquier rol, incluso docente.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- cambios desde el panel de Supabase
  if new.access is distinct from old.access then
    if new.id = auth.uid() then
      raise exception 'No podés cambiar tu propio acceso';
    end if;
    if not public.is_docente() then
      raise exception 'Solo un docente o un admin aprueba cuentas';
    end if;
    if exists (select 1 from admins a where a.email = old.email) and not public.is_admin() then
      raise exception 'No se le puede quitar el acceso a un admin';
    end if;
    new.access_by := auth.uid();
    new.access_at := now();
  else
    new.access_by := old.access_by;
    new.access_at := old.access_at;
  end if;
  if new.email <> old.email then
    raise exception 'El email no se puede cambiar';
  end if;
  if new.role <> old.role and not public.is_docente() then
    raise exception 'Solo un docente puede cambiar roles';
  end if;
  if new.role <> old.role and public.is_admin() then
    return new;
  end if;
  if new.role <> old.role and old.role = 'docente' then
    raise exception 'El rol docente lo da el dominio del email';
  end if;
  if new.role <> old.role and new.role = 'docente' then
    raise exception 'El rol docente lo da el dominio del email';
  end if;
  if new.id <> auth.uid() and (new.full_name <> old.full_name or new.avatar_url is distinct from old.avatar_url) then
    raise exception 'Solo podés editar tu propio perfil';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- ---------------------------------------------------------------------
-- Reglas de negocio
-- ---------------------------------------------------------------------

-- Quien crea un proyecto queda como miembro
create or replace function public.project_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into project_members (project_id, user_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.project_before_insert() returns trigger
language plpgsql as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end $$;

drop trigger if exists project_before_insert on public.projects;
create trigger project_before_insert before insert on public.projects
  for each row execute function public.project_before_insert();
drop trigger if exists project_after_insert on public.projects;
create trigger project_after_insert after insert on public.projects
  for each row execute function public.project_after_insert();

-- Un área solo puede tener miembros del proyecto
create or replace function public.check_area_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from areas a join project_members m on m.project_id = a.project_id
    where a.id = new.area_id and m.user_id = new.user_id
  ) then
    raise exception 'La persona tiene que ser miembro del proyecto antes de sumarla a un área';
  end if;
  return new;
end $$;

drop trigger if exists check_area_member on public.area_members;
create trigger check_area_member before insert or update on public.area_members
  for each row execute function public.check_area_member();

-- Tareas: los estudiantes solo pueden mover el estado de sus propias tareas,
-- y nunca a "hecha" (eso lo confirma un docente o líder).
create or replace function public.guard_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;

  if new.area_id is not null and not exists (select 1 from areas where id = new.area_id and project_id = new.project_id) then
    raise exception 'El área no pertenece a este proyecto';
  end if;
  if new.milestone_id is not null and not exists (select 1 from milestones where id = new.milestone_id and project_id = new.project_id) then
    raise exception 'El hito no pertenece a este proyecto';
  end if;
  if new.assignee_id is not null and not exists (select 1 from project_members where project_id = new.project_id and user_id = new.assignee_id) then
    raise exception 'La persona asignada no es miembro del proyecto';
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_staff() then
    if (new.project_id, new.area_id, new.milestone_id, new.title, new.description, new.priority, new.assignee_id, new.due_date)
       is distinct from
       (old.project_id, old.area_id, old.milestone_id, old.title, old.description, old.priority, old.assignee_id, old.due_date) then
      raise exception 'Solo podés cambiar el estado de tus tareas';
    end if;
    if new.status = 'hecha' and old.status <> 'hecha' then
      raise exception 'Mandala a revisión: un docente o líder la marca como hecha';
    end if;
    if old.status = 'hecha' and new.status <> 'hecha' then
      raise exception 'Esta tarea ya está hecha: solo un docente o líder la puede reabrir';
    end if;
  end if;

  if new.status = 'hecha' and (tg_op = 'INSERT' or old.status <> 'hecha') then
    new.completed_at := now();
  elsif new.status <> 'hecha' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists guard_task on public.tasks;
create trigger guard_task before insert or update on public.tasks
  for each row execute function public.guard_task();

-- Avances: el autor puede editar mientras no esté revisado;
-- solo docentes y líderes ponen estado, nota y devolución.
create or replace function public.guard_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
    new.status := 'pendiente';
    new.score := null;
    new.feedback := '';
    new.reviewed_by := null;
    new.reviewed_at := null;
    if new.area_id is not null and not exists (select 1 from areas where id = new.area_id and project_id = new.project_id) then
      raise exception 'El área no pertenece a este proyecto';
    end if;
    if new.task_id is not null and not exists (select 1 from tasks where id = new.task_id and project_id = new.project_id) then
      raise exception 'La tarea no pertenece a este proyecto';
    end if;
    return new;
  end if;

  if new.author_id <> old.author_id or new.project_id <> old.project_id then
    raise exception 'No se puede cambiar el autor ni el proyecto de un avance';
  end if;

  if (new.status, new.score, new.feedback) is distinct from (old.status, old.score, old.feedback) then
    if auth.uid() is not null and not public.is_staff() then
      raise exception 'Solo un docente o líder puede revisar avances';
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
    if new.status = 'pendiente' then
      new.reviewed_by := null; new.reviewed_at := null;
    end if;
  elsif auth.uid() is not null and not public.is_staff() then
    if old.status = 'aprobado' then
      raise exception 'Este avance ya fue aprobado y no se puede editar';
    end if;
    -- si lo corrige después de un pedido de cambios, vuelve a revisión
    new.status := 'pendiente';
  end if;
  return new;
end $$;

drop trigger if exists guard_update on public.updates;
create trigger guard_update before insert or update on public.updates
  for each row execute function public.guard_update();

create or replace function public.guard_inventory() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.responsible_id is not null and not exists (select 1 from project_members where project_id = new.project_id and user_id = new.responsible_id) then
    raise exception 'La persona responsable no es miembro del proyecto';
  end if;
  return new;
end $$;

drop trigger if exists guard_inventory on public.inventory;
create trigger guard_inventory before insert or update on public.inventory
  for each row execute function public.guard_inventory();

-- ---------------------------------------------------------------------
-- Bitácora y notificaciones automáticas
-- ---------------------------------------------------------------------
create or replace function public.log_activity(p uuid, k text, msg text) returns void
language sql security definer set search_path = public as $$
  insert into activity (project_id, actor_id, kind, message) values (p, auth.uid(), k, msg);
$$;

create or replace function public.notify(u uuid, p uuid, msg text, lnk text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, project_id, message, link)
  select u, p, msg, lnk where u is not null and u is distinct from auth.uid();
$$;

create or replace function public.display_name(u uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(full_name, ''), email) from profiles where id = u;
$$;

create or replace function public.track_tasks() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lnk text := '#/proyecto/' || new.project_id || '/tareas';
begin
  if tg_op = 'INSERT' then
    perform log_activity(new.project_id, 'tarea', 'Creó la tarea "' || new.title || '"');
    perform notify(new.assignee_id, new.project_id, 'Te asignaron la tarea "' || new.title || '"', lnk);
  else
    if new.assignee_id is distinct from old.assignee_id then
      perform notify(new.assignee_id, new.project_id, 'Te asignaron la tarea "' || new.title || '"', lnk);
    end if;
    if new.status <> old.status then
      perform log_activity(new.project_id, 'tarea',
        'Movió "' || new.title || '" a ' || replace(new.status::text, '_', ' '));
      if new.status = 'en_revision' then
        perform notify(new.created_by, new.project_id, '"' || new.title || '" está lista para revisar', lnk);
      elsif new.status = 'hecha' then
        perform notify(new.assignee_id, new.project_id, 'Tu tarea "' || new.title || '" quedó como hecha', lnk);
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists track_tasks on public.tasks;
create trigger track_tasks after insert or update on public.tasks
  for each row execute function public.track_tasks();

create or replace function public.track_updates() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lnk text := '#/proyecto/' || new.project_id || '/avances';
begin
  if tg_op = 'INSERT' then
    perform log_activity(new.project_id, 'avance', 'Subió el avance "' || new.title || '"');
  elsif new.status <> old.status and new.status <> 'pendiente' then
    perform log_activity(new.project_id, 'revision',
      case new.status when 'aprobado' then 'Aprobó' else 'Pidió cambios en' end
      || ' el avance "' || new.title || '" de ' || display_name(new.author_id));
    perform notify(new.author_id, new.project_id,
      case new.status when 'aprobado' then 'Aprobaron tu avance "' else 'Pidieron cambios en tu avance "' end
      || new.title || '"', lnk);
  end if;
  return new;
end $$;

drop trigger if exists track_updates on public.updates;
create trigger track_updates after insert or update on public.updates
  for each row execute function public.track_updates();

create or replace function public.track_comments() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u record;
  lnk text;
  m uuid;
begin
  select project_id, author_id, title into u from updates where id = new.update_id;
  lnk := '#/proyecto/' || u.project_id || '/avances';
  -- Menciones: solo se avisa a miembros del proyecto
  foreach m in array coalesce(new.mentions, '{}') loop
    if exists (select 1 from project_members where project_id = u.project_id and user_id = m) then
      perform notify(m, u.project_id, display_name(new.author_id) || ' te mencionó en "' || u.title || '"', lnk);
    end if;
  end loop;
  if not (u.author_id = any(coalesce(new.mentions, '{}'))) then
    perform notify(u.author_id, u.project_id, 'Nuevo comentario en tu avance "' || u.title || '"', lnk);
  end if;
  return new;
end $$;

drop trigger if exists track_comments on public.comments;
create trigger track_comments after insert on public.comments
  for each row execute function public.track_comments();

create or replace function public.track_members() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform log_activity(new.project_id, 'equipo', 'Sumó a ' || display_name(new.user_id) || ' al proyecto');
    perform notify(new.user_id, new.project_id,
      'Te sumaron al proyecto "' || (select name from projects where id = new.project_id) || '"',
      '#/proyecto/' || new.project_id);
    return new;
  else
    if exists (select 1 from projects where id = old.project_id) then
      perform log_activity(old.project_id, 'equipo', 'Sacó a ' || display_name(old.user_id) || ' del proyecto');
    end if;
    return old;
  end if;
end $$;

drop trigger if exists track_members on public.project_members;
create trigger track_members after insert or delete on public.project_members
  for each row execute function public.track_members();

create or replace function public.track_simple() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'milestones' then
    if tg_op = 'INSERT' then
      perform log_activity(new.project_id, 'hito', 'Agregó el hito "' || new.title || '"');
    elsif new.done and not old.done then
      perform log_activity(new.project_id, 'hito', 'Cumplió el hito "' || new.title || '"');
    end if;
  elsif tg_table_name = 'project_files' then
    perform log_activity(new.project_id, 'archivo', 'Subió el archivo "' || new.name || '"');
  elsif tg_table_name = 'inventory' then
    if tg_op = 'INSERT' then
      perform log_activity(new.project_id, 'inventario', 'Agregó "' || new.name || '" al inventario');
    elsif new.status <> old.status then
      perform log_activity(new.project_id, 'inventario', '"' || new.name || '" pasó a ' || replace(new.status::text, '_', ' '));
    end if;
  elsif tg_table_name = 'areas' then
    perform log_activity(new.project_id, 'area', 'Creó el área "' || new.name || '"');
  end if;
  return new;
end $$;

drop trigger if exists track_milestones on public.milestones;
create trigger track_milestones after insert or update on public.milestones
  for each row execute function public.track_simple();
drop trigger if exists track_files on public.project_files;
create trigger track_files after insert on public.project_files
  for each row execute function public.track_simple();
drop trigger if exists track_inventory on public.inventory;
create trigger track_inventory after insert or update on public.inventory
  for each row execute function public.track_simple();
drop trigger if exists track_areas on public.areas;
create trigger track_areas after insert on public.areas
  for each row execute function public.track_simple();

-- ---------------------------------------------------------------------
-- Rendimiento
-- Puntaje orientativo de 0 a 100:
--   50 % cumplimiento: tareas hechas / tareas asignadas
--   30 % calidad: nota promedio de avances aprobados (sobre 10)
--   20 % puntualidad: tareas hechas a tiempo / tareas hechas
-- Los estudiantes solo ven su propia fila; docentes y líderes ven todas.
-- ---------------------------------------------------------------------
create or replace function public.student_performance(p uuid)
returns table (
  user_id uuid, full_name text, email text,
  tasks_assigned int, tasks_done int, tasks_on_time int, tasks_overdue int,
  updates_total int, updates_approved int, avg_score numeric, score int
)
language sql stable security definer set search_path = public as $$
  with base as (
    select
      m.user_id,
      count(t.id)                                                                    as assigned,
      count(t.id) filter (where t.status = 'hecha')                                  as done,
      count(t.id) filter (where t.status = 'hecha' and (t.due_date is null or t.completed_at::date <= t.due_date)) as on_time,
      count(t.id) filter (where t.status <> 'hecha' and t.due_date < current_date)   as overdue
    from project_members m
    left join tasks t on t.project_id = m.project_id and t.assignee_id = m.user_id
    where m.project_id = p
    group by m.user_id
  ), ups as (
    select
      u.author_id as user_id,
      count(*)                                       as total,
      count(*) filter (where u.status = 'aprobado')  as approved,
      avg(u.score) filter (where u.status = 'aprobado' and u.score is not null) as avg_score
    from updates u
    where u.project_id = p
    group by u.author_id
  )
  select
    b.user_id, pr.full_name, pr.email,
    b.assigned::int, b.done::int, b.on_time::int, b.overdue::int,
    coalesce(x.total, 0)::int, coalesce(x.approved, 0)::int, round(x.avg_score, 1),
    case when b.assigned = 0 and x.avg_score is null then null else round(
      (case when b.assigned > 0 then 50.0 * b.done / b.assigned else 0 end
       + case when x.avg_score is not null then 3.0 * x.avg_score else 0 end
       + case when b.done > 0 then 20.0 * b.on_time / b.done else 0 end)
      * 100.0 / (case when b.assigned > 0 then 70 else 0 end + case when x.avg_score is not null then 30 else 0 end)
    )::int end
  from base b
  join profiles pr on pr.id = b.user_id
  left join ups x on x.user_id = b.user_id
  where public.can_view_project(p)
    and (public.is_staff() or b.user_id = auth.uid())
  order by pr.full_name;
$$;

-- Resumen por área (equipo). Lo ve cualquier miembro del proyecto: son totales, no datos personales.
create or replace function public.area_performance(p uuid)
returns table (
  area_id uuid, area_name text, color text, members int,
  tasks_total int, tasks_done int, tasks_overdue int,
  updates_total int, updates_approved int, avg_score numeric, progress int
)
language sql stable security definer set search_path = public as $$
  select
    a.id, a.name, a.color,
    (select count(*) from area_members am where am.area_id = a.id)::int,
    (select count(*) from tasks t where t.area_id = a.id)::int,
    (select count(*) from tasks t where t.area_id = a.id and t.status = 'hecha')::int,
    (select count(*) from tasks t where t.area_id = a.id and t.status <> 'hecha' and t.due_date < current_date)::int,
    (select count(*) from updates u where u.area_id = a.id)::int,
    (select count(*) from updates u where u.area_id = a.id and u.status = 'aprobado')::int,
    (select round(avg(u.score), 1) from updates u where u.area_id = a.id and u.status = 'aprobado'),
    (select case when count(*) = 0 then 0 else (100.0 * count(*) filter (where t.status = 'hecha') / count(*))::int end
       from tasks t where t.area_id = a.id)
  from areas a
  where a.project_id = p and public.can_view_project(p)
  order by a.name;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.admins          enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.areas           enable row level security;
alter table public.area_members    enable row level security;
alter table public.milestones      enable row level security;
alter table public.tasks           enable row level security;
alter table public.updates         enable row level security;
alter table public.comments        enable row level security;
alter table public.project_files   enable row level security;
alter table public.inventory       enable row level security;
alter table public.activity        enable row level security;
alter table public.notifications   enable row level security;

do $$
declare r record;
begin
  -- Solo las tablas de la plataforma: las demás tablas del proyecto conservan sus reglas
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('profiles', 'admins', 'projects', 'project_members', 'areas', 'area_members',
                               'milestones', 'tasks', 'updates', 'comments', 'project_files', 'inventory',
                               'activity', 'notifications', 'tests', 'issues', 'equipment', 'reservations') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Perfiles: todos los usuarios logueados ven nombres; cada uno edita el suyo, los docentes cambian roles
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy admins_select on public.admins for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_docente()) with check (id = auth.uid() or public.is_docente());

-- Proyectos
create policy projects_select on public.projects for select to authenticated using (public.can_view_project(id));
create policy projects_insert on public.projects for insert to authenticated with check (public.is_staff());
create policy projects_update on public.projects for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy projects_delete on public.projects for delete to authenticated using (public.is_staff());

-- Miembros, áreas e hitos: los ven los miembros, los gestionan docentes y líderes
create policy members_select on public.project_members for select to authenticated using (public.can_view_project(project_id));
create policy members_write  on public.project_members for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy areas_select on public.areas for select to authenticated using (public.can_view_project(project_id));
create policy areas_write  on public.areas for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy area_members_select on public.area_members for select to authenticated
  using (exists (select 1 from public.areas a where a.id = area_id and public.can_view_project(a.project_id)));
create policy area_members_write on public.area_members for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy milestones_select on public.milestones for select to authenticated using (public.can_view_project(project_id));
create policy milestones_write  on public.milestones for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Tareas: las crean docentes y líderes; cada estudiante mueve el estado de las suyas
create policy tasks_select on public.tasks for select to authenticated using (public.can_view_project(project_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (public.is_staff());
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_staff() or assignee_id = auth.uid())
  with check (public.is_staff() or assignee_id = auth.uid());
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_staff());

-- Avances
create policy updates_select on public.updates for select to authenticated using (public.can_view_project(project_id));
create policy updates_insert on public.updates for insert to authenticated
  with check (public.can_view_project(project_id) and author_id = auth.uid());
create policy updates_update on public.updates for update to authenticated
  using (public.is_staff() or author_id = auth.uid())
  with check (public.is_staff() or author_id = auth.uid());
create policy updates_delete on public.updates for delete to authenticated
  using (public.is_staff() or (author_id = auth.uid() and status <> 'aprobado'));

-- Comentarios
create policy comments_select on public.comments for select to authenticated
  using (exists (select 1 from public.updates u where u.id = update_id and public.can_view_project(u.project_id)));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.updates u where u.id = update_id and public.can_view_project(u.project_id)));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

-- Archivos del proyecto
create policy files_select on public.project_files for select to authenticated using (public.can_view_project(project_id));
create policy files_insert on public.project_files for insert to authenticated
  with check (public.can_view_project(project_id) and uploaded_by = auth.uid());
create policy files_delete on public.project_files for delete to authenticated
  using (public.is_staff() or uploaded_by = auth.uid());

-- Inventario: cualquier miembro agrega y actualiza; borran docentes y líderes
create policy inventory_select on public.inventory for select to authenticated using (public.can_view_project(project_id));
create policy inventory_insert on public.inventory for insert to authenticated with check (public.can_view_project(project_id));
create policy inventory_update on public.inventory for update to authenticated
  using (public.can_view_project(project_id)) with check (public.can_view_project(project_id));
create policy inventory_delete on public.inventory for delete to authenticated using (public.is_staff());

-- Bitácora: solo lectura
create policy activity_select on public.activity for select to authenticated using (public.can_view_project(project_id));

-- Notificaciones: cada uno las suyas
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Las funciones de permisos no se exponen a usuarios anónimos
revoke execute on function public.student_performance(uuid) from public, anon;
revoke execute on function public.area_performance(uuid) from public, anon;
grant execute on function public.student_performance(uuid) to authenticated;
grant execute on function public.area_performance(uuid) to authenticated;
revoke execute on function public.log_activity(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.notify(uuid, uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Almacenamiento de archivos (bucket privado "proyectos")
-- Rutas: <project_id>/avances/<archivo> o <project_id>/archivos/<archivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('proyectos', 'proyectos', false, 52428800)  -- 50 MB por archivo
on conflict (id) do nothing;

create or replace function public.storage_project(path text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end $$;

drop policy if exists proyectos_select on storage.objects;
drop policy if exists proyectos_insert on storage.objects;
drop policy if exists proyectos_delete on storage.objects;

create policy proyectos_select on storage.objects for select to authenticated
  using (bucket_id = 'proyectos' and public.can_view_project(public.storage_project(name)));
create policy proyectos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'proyectos' and public.can_view_project(public.storage_project(name)));
create policy proyectos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'proyectos' and (owner = auth.uid() or public.is_staff()));

-- =====================================================================
-- Ensayos, fallas y turnos de equipos
-- =====================================================================

do $$ begin
  create type public.test_result as enum ('exitoso', 'parcial', 'fallido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_status as enum ('abierta', 'en_proceso', 'resuelta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_severity as enum ('baja', 'media', 'alta', 'critica');
exception when duplicate_object then null; end $$;

-- Registro de ensayos (pruebas de campo, de banco, etc.)
create table if not exists public.tests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  area_id      uuid references public.areas(id) on delete set null,
  title        text not null check (length(trim(title)) > 0),
  test_date    date not null default current_date,
  objective    text not null default '',
  result       public.test_result not null,
  notes        text not null default '',
  attachments  jsonb not null default '[]'::jsonb,
  author_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Fallas encontradas (pueden venir de un ensayo o no)
create table if not exists public.issues (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  test_id      uuid references public.tests(id) on delete set null,
  area_id      uuid references public.areas(id) on delete set null,
  title        text not null check (length(trim(title)) > 0),
  description  text not null default '',
  severity     public.issue_severity not null default 'media',
  status       public.issue_status not null default 'abierta',
  assignee_id  uuid references public.profiles(id) on delete set null,
  resolution   text not null default '',
  created_by   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Equipos e instrumentos del taller que se reservan por turnos
create table if not exists public.equipment (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique check (length(trim(name)) > 0),
  description  text not null default '',
  color        text not null default '#3774bc',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.reservations (
  id            uuid primary key default gen_random_uuid(),
  equipment_id  uuid not null references public.equipment(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  area_id       uuid references public.areas(id) on delete set null,
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  purpose       text not null default '',
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '12 hours')
);

create index if not exists tests_project_idx on public.tests(project_id, test_date desc);
create index if not exists issues_project_idx on public.issues(project_id, status);
create index if not exists reservations_time_idx on public.reservations(equipment_id, starts_at);

-- Ensayos: el autor y el área tienen que ser del proyecto
create or replace function public.guard_test() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
  elsif new.author_id <> old.author_id or new.project_id <> old.project_id then
    raise exception 'No se puede cambiar el autor ni el proyecto de un ensayo';
  end if;
  if new.area_id is not null and not exists (select 1 from areas where id = new.area_id and project_id = new.project_id) then
    raise exception 'El área no pertenece a este proyecto';
  end if;
  return new;
end $$;

drop trigger if exists guard_test on public.tests;
create trigger guard_test before insert or update on public.tests
  for each row execute function public.guard_test();

-- Fallas: coherencia con el proyecto y fecha de resolución automática
create or replace function public.guard_issue() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif new.created_by <> old.created_by or new.project_id <> old.project_id then
    raise exception 'No se puede cambiar el autor ni el proyecto de una falla';
  end if;
  if new.area_id is not null and not exists (select 1 from areas where id = new.area_id and project_id = new.project_id) then
    raise exception 'El área no pertenece a este proyecto';
  end if;
  if new.test_id is not null and not exists (select 1 from tests where id = new.test_id and project_id = new.project_id) then
    raise exception 'El ensayo no pertenece a este proyecto';
  end if;
  if new.assignee_id is not null and not exists (select 1 from project_members where project_id = new.project_id and user_id = new.assignee_id) then
    raise exception 'La persona asignada no es miembro del proyecto';
  end if;
  if new.status = 'resuelta' and (tg_op = 'INSERT' or old.status <> 'resuelta') then
    new.resolved_at := now();
  elsif new.status <> 'resuelta' then
    new.resolved_at := null;
  end if;
  return new;
end $$;

drop trigger if exists guard_issue on public.issues;
create trigger guard_issue before insert or update on public.issues
  for each row execute function public.guard_issue();

-- Turnos: sin superposición en el mismo equipo y siempre a nombre de un miembro del proyecto
create or replace function public.guard_reservation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  clash record;
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(auth.uid(), new.user_id);
  end if;
  if new.ends_at <= new.starts_at then
    raise exception 'El turno tiene que terminar después de empezar';
  end if;
  if new.ends_at - new.starts_at > interval '12 hours' then
    raise exception 'Un turno puede durar como máximo 12 horas';
  end if;
  if not exists (select 1 from equipment where id = new.equipment_id and active) then
    raise exception 'Ese equipo no está disponible para reservar';
  end if;
  if new.area_id is not null and not exists (select 1 from areas where id = new.area_id and project_id = new.project_id) then
    raise exception 'El área no pertenece a este proyecto';
  end if;

  -- Bloquear el equipo mientras se revisa, para que dos reservas simultáneas no se pisen
  perform 1 from equipment where id = new.equipment_id for update;
  select r.starts_at, r.ends_at, p.name into clash
  from reservations r join projects p on p.id = r.project_id
  where r.equipment_id = new.equipment_id
    and r.id <> new.id
    and tstzrange(r.starts_at, r.ends_at) && tstzrange(new.starts_at, new.ends_at)
  limit 1;
  if found then
    raise exception 'Ese horario se superpone con un turno de "%" (% a %)', clash.name,
      to_char(clash.starts_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM HH24:MI'),
      to_char(clash.ends_at at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI');
  end if;
  return new;
end $$;

drop trigger if exists guard_reservation on public.reservations;
create trigger guard_reservation before insert or update on public.reservations
  for each row execute function public.guard_reservation();

-- Bitácora y avisos
create or replace function public.track_tests_issues() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lnk text := '#/proyecto/' || new.project_id || '/ensayos';
begin
  if tg_table_name = 'tests' then
    perform log_activity(new.project_id, 'ensayo', 'Registró el ensayo "' || new.title || '" (' || new.result || ')');
  elsif tg_op = 'INSERT' then
    perform log_activity(new.project_id, 'falla', 'Reportó la falla "' || new.title || '"');
    perform notify(new.assignee_id, new.project_id, 'Te asignaron la falla "' || new.title || '"', lnk);
  else
    if new.assignee_id is distinct from old.assignee_id then
      perform notify(new.assignee_id, new.project_id, 'Te asignaron la falla "' || new.title || '"', lnk);
    end if;
    if new.status <> old.status then
      perform log_activity(new.project_id, 'falla',
        case new.status when 'resuelta' then 'Resolvió la falla "' when 'abierta' then 'Reabrió la falla "' else 'Empezó a trabajar en la falla "' end
        || new.title || '"');
      if new.status = 'resuelta' then
        perform notify(new.created_by, new.project_id, 'Se resolvió la falla "' || new.title || '"', lnk);
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists track_tests on public.tests;
create trigger track_tests after insert on public.tests
  for each row execute function public.track_tests_issues();
drop trigger if exists track_issues on public.issues;
create trigger track_issues after insert or update on public.issues
  for each row execute function public.track_tests_issues();

-- Permisos
alter table public.tests        enable row level security;
alter table public.issues       enable row level security;
alter table public.equipment    enable row level security;
alter table public.reservations enable row level security;

drop policy if exists tests_select on public.tests;
drop policy if exists tests_insert on public.tests;
drop policy if exists tests_update on public.tests;
drop policy if exists tests_delete on public.tests;
drop policy if exists issues_select on public.issues;
drop policy if exists issues_insert on public.issues;
drop policy if exists issues_update on public.issues;
drop policy if exists issues_delete on public.issues;
drop policy if exists equipment_select on public.equipment;
drop policy if exists equipment_write on public.equipment;
drop policy if exists reservations_select on public.reservations;
drop policy if exists reservations_insert on public.reservations;
drop policy if exists reservations_update on public.reservations;
drop policy if exists reservations_delete on public.reservations;

-- Ensayos: cualquier miembro registra; edita el autor o docentes/líderes
create policy tests_select on public.tests for select to authenticated using (public.can_view_project(project_id));
create policy tests_insert on public.tests for insert to authenticated
  with check (public.can_view_project(project_id) and author_id = auth.uid());
create policy tests_update on public.tests for update to authenticated
  using (public.is_staff() or author_id = auth.uid()) with check (public.is_staff() or author_id = auth.uid());
create policy tests_delete on public.tests for delete to authenticated
  using (public.is_staff() or author_id = auth.uid());

-- Fallas: cualquier miembro reporta; actualizan quien la reportó, quien la tiene asignada o docentes/líderes
create policy issues_select on public.issues for select to authenticated using (public.can_view_project(project_id));
create policy issues_insert on public.issues for insert to authenticated
  with check (public.can_view_project(project_id) and created_by = auth.uid());
create policy issues_update on public.issues for update to authenticated
  using (public.is_staff() or created_by = auth.uid() or assignee_id = auth.uid())
  with check (public.can_view_project(project_id));
create policy issues_delete on public.issues for delete to authenticated
  using (public.is_staff() or created_by = auth.uid());

-- Equipos: los ve cualquiera con cuenta; los cargan docentes/líderes
create policy equipment_select on public.equipment for select to authenticated using (true);
create policy equipment_write on public.equipment for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Turnos: la agenda se lee con reservation_agenda(); cada uno maneja los suyos
create policy reservations_select on public.reservations for select to authenticated
  using (public.is_staff() or user_id = auth.uid() or public.can_view_project(project_id));
create policy reservations_insert on public.reservations for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_project(project_id));
create policy reservations_update on public.reservations for update to authenticated
  using (public.is_staff() or user_id = auth.uid())
  with check ((public.is_staff() or user_id = auth.uid()) and public.can_view_project(project_id));
create policy reservations_delete on public.reservations for delete to authenticated
  using (public.is_staff() or user_id = auth.uid());

-- Agenda de turnos: todos ven qué equipo está ocupado y por qué proyecto, aunque no sean miembros
create or replace function public.reservation_agenda(desde timestamptz, hasta timestamptz)
returns table (
  id uuid, equipment_id uuid, project_id uuid, project_name text, project_color text,
  area_id uuid, area_name text, user_id uuid, user_name text,
  starts_at timestamptz, ends_at timestamptz, purpose text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.equipment_id, r.project_id, p.name, p.color, r.area_id, a.name,
         r.user_id, coalesce(nullif(pr.full_name, ''), pr.email), r.starts_at, r.ends_at, r.purpose
  from reservations r
  join projects p on p.id = r.project_id
  left join areas a on a.id = r.area_id
  join profiles pr on pr.id = r.user_id
  where auth.uid() is not null and r.starts_at < hasta and r.ends_at > desde
  order by r.starts_at;
$$;
revoke execute on function public.reservation_agenda(timestamptz, timestamptz) from public, anon;
grant execute on function public.reservation_agenda(timestamptz, timestamptz) to authenticated;

-- Equipos de ejemplo (se pueden editar o desactivar desde la plataforma)
insert into public.equipment (name, description, color) values
  ('Impresora 3D', 'Impresora FDM del taller', '#3774bc'),
  ('Estación de soldado', 'Soldador y estación de aire caliente', '#ffb454'),
  ('Osciloscopio', 'Osciloscopio digital de 2 canales', '#4fbf8b')
on conflict (name) do nothing;

-- =====================================================================
-- Sitio web público (editor de contenidos)
-- El sitio lee lo publicado sin login; editar, publicar y subir fotos
-- queda solo para docentes y admins con sesión iniciada.
-- =====================================================================

create table if not exists public.aero_draft (
  id          text primary key,
  content     jsonb not null default '{}'::jsonb,
  revision    integer not null default 1,
  updated_at  timestamptz not null default now()
);

create table if not exists public.aero_published (
  id            text primary key,
  content       jsonb not null default '{}'::jsonb,
  version       integer not null default 0,
  published_at  timestamptz
);

insert into public.aero_draft (id) values ('main') on conflict (id) do nothing;
insert into public.aero_published (id) values ('main') on conflict (id) do nothing;

-- Pueden editar el sitio: docentes y admins (is_docente() incluye a los admins)
create or replace function public.can_edit_site() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and public.is_docente();
$$;

alter table public.aero_draft     enable row level security;
alter table public.aero_published enable row level security;

-- Sacar las políticas anteriores (las que permitían editar sin login)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('aero_draft', 'aero_published') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Lo publicado lo lee cualquiera (es la web pública)
create policy aero_published_read on public.aero_published for select to anon, authenticated using (true);

-- El borrador solo lo ven y lo editan docentes y admins
create policy aero_draft_read   on public.aero_draft for select to authenticated using (public.can_edit_site());
create policy aero_draft_insert on public.aero_draft for insert to authenticated with check (public.can_edit_site());
create policy aero_draft_update on public.aero_draft for update to authenticated
  using (public.can_edit_site()) with check (public.can_edit_site());

-- Publicar: copia el borrador a la versión pública y suma una versión
drop function if exists public.aero_publish();
create function public.aero_publish() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v integer;
begin
  if not public.can_edit_site() then
    raise exception 'Solo docentes y admins pueden publicar el sitio';
  end if;
  insert into aero_published (id, content, version, published_at)
  select 'main', d.content, 1, now() from aero_draft d where d.id = 'main'
  on conflict (id) do update
    set content = excluded.content,
        version = aero_published.version + 1,
        published_at = now()
  returning version into v;
  if v is null then
    raise exception 'No hay borrador para publicar';
  end if;
  return v;
end $$;

revoke execute on function public.aero_publish() from public, anon;
grant execute on function public.aero_publish() to authenticated;

-- Fotos del sitio: bucket público (la web las muestra sin login), pero solo docentes y admins suben o borran
insert into storage.buckets (id, name, public, file_size_limit)
values ('aero-media', 'aero-media', true, 5242880)  -- 5 MB por foto
on conflict (id) do nothing;

do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and (coalesce(qual, '') || coalesce(with_check, '')) like '%aero-media%' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy aero_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'aero-media' and public.can_edit_site());
create policy aero_media_update on storage.objects for update to authenticated
  using (bucket_id = 'aero-media' and public.can_edit_site())
  with check (bucket_id = 'aero-media' and public.can_edit_site());
create policy aero_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'aero-media' and public.can_edit_site());

-- =====================================================================
-- Docentes de la web pública
-- La web los lee sin login; los editan docentes y admins desde la plataforma.
-- =====================================================================
create table if not exists public.site_teachers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (length(trim(full_name)) > 0),
  role_es     text not null default 'Docente del taller',
  role_en     text not null default 'Workshop teacher',
  email       text not null default '' check (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text not null default '' check (length(phone) <= 40),
  photo_url   text not null default '' check (photo_url = '' or photo_url ~ '^https://'),
  position    integer not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.site_teachers enable row level security;
drop policy if exists site_teachers_read on public.site_teachers;
drop policy if exists site_teachers_write on public.site_teachers;
create policy site_teachers_read on public.site_teachers for select to anon, authenticated
  using (visible or public.can_edit_site());
create policy site_teachers_write on public.site_teachers for all to authenticated
  using (public.can_edit_site()) with check (public.can_edit_site());

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists site_teachers_touch on public.site_teachers;
create trigger site_teachers_touch before update on public.site_teachers
  for each row execute function public.touch_updated_at();

-- Docentes que ya estaban en la web (solo la primera vez)
do $$
begin
  if not exists (select 1 from public.site_teachers) then
    insert into public.site_teachers (full_name, email, phone, photo_url, position) values
      ('María Gema Pont', 'maria.pont@etec.um.edu.ar', '',
       'https://nveisqekmbcdvnuebice.supabase.co/storage/v1/object/public/aero-media/cms/ec9862ce-7472-4d67-a3b0-1cd2de522b10.webp', 1),
      ('Patricia Furci', 'patricia.furci@etec.um.edu.ar', '',
       'https://nveisqekmbcdvnuebice.supabase.co/storage/v1/object/public/aero-media/cms/a329761b-08ce-4d51-a422-62d4a93e6f17.webp', 2),
      ('Mario Papetti Funes', 'mario.papetti@etec.um.edu.ar', '+54 9 261 566-4422',
       'https://nveisqekmbcdvnuebice.supabase.co/storage/v1/object/public/aero-media/cms/0a8357e5-9ffa-4218-b683-cad24bf2fa5f.webp', 3);
  end if;
end $$;

-- =====================================================================
-- Charlas y competencias
-- =====================================================================
do $$ begin
  create type public.event_kind as enum ('charla', 'competencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('preparacion', 'confirmado', 'realizado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.material_kind as enum ('presentacion', 'infografia', 'enlace', 'documento', 'video');
exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  kind         public.event_kind not null,
  title        text not null check (length(trim(title)) > 0),
  description  text not null default '',
  starts_on    date not null,
  ends_on      date,
  location     text not null default '',
  organizer    text not null default '',
  website      text not null default '' check (website = '' or website ~ '^https?://'),
  status       public.event_status not null default 'preparacion',
  color        text not null default '#3774bc',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.event_members (
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default '',
  added_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Proyectos que se presentan: del panel (project_id) o de afuera (solo nombre)
create table if not exists public.event_projects (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  name        text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now(),
  check (project_id is not null or length(trim(name)) > 0)
);

create table if not exists public.event_materials (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  kind        public.material_kind not null,
  title       text not null check (length(trim(title)) > 0),
  url         text not null default '' check (url = '' or url ~ '^https?://'),
  path        text not null default '',
  size        bigint not null default 0,
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (url <> '' or path <> '')
);

create table if not exists public.event_tasks (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  done         boolean not null default false,
  assignee_id  uuid references public.profiles(id) on delete set null,
  due_date     date,
  created_at   timestamptz not null default now()
);

create index if not exists events_date_idx on public.events(starts_on);
create index if not exists event_materials_idx on public.event_materials(event_id, created_at desc);
create index if not exists event_tasks_idx on public.event_tasks(event_id);

-- Quién ve un evento: docentes, líderes, admins y el equipo del evento
create or replace function public.can_view_event(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or (public.is_approved() and exists (select 1 from event_members where event_id = e and user_id = auth.uid()));
$$;

-- Quien crea el evento queda en el equipo
create or replace function public.event_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into event_members (event_id, user_id, role) values (new.id, new.created_by, 'Organización')
    on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.event_before_insert() returns trigger
language plpgsql as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end $$;

drop trigger if exists event_before_insert on public.events;
create trigger event_before_insert before insert on public.events
  for each row execute function public.event_before_insert();
drop trigger if exists event_after_insert on public.events;
create trigger event_after_insert after insert on public.events
  for each row execute function public.event_after_insert();

-- Aviso al sumar a alguien al equipo de un evento
create or replace function public.track_event_members() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ev record;
begin
  select title, kind into ev from events where id = new.event_id;
  if new.user_id is distinct from auth.uid() then
    insert into notifications (user_id, project_id, message, link)
    values (new.user_id, null,
            'Te sumaron a la ' || ev.kind || ' "' || ev.title || '"',
            '#/evento/' || new.event_id);
  end if;
  return new;
end $$;

drop trigger if exists track_event_members on public.event_members;
create trigger track_event_members after insert on public.event_members
  for each row execute function public.track_event_members();

-- Las tareas de preparación solo se asignan a gente del equipo
create or replace function public.guard_event_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null and not exists (select 1 from event_members where event_id = new.event_id and user_id = new.assignee_id) then
    raise exception 'La persona asignada no está en el equipo del evento';
  end if;
  if tg_op = 'UPDATE' and new.event_id <> old.event_id then
    raise exception 'No se puede mover una tarea a otro evento';
  end if;
  return new;
end $$;

drop trigger if exists guard_event_task on public.event_tasks;
create trigger guard_event_task before insert or update on public.event_tasks
  for each row execute function public.guard_event_task();

create or replace function public.guard_event_material() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
  end if;
  -- Los archivos subidos tienen que estar en la carpeta del evento
  if new.path <> '' and new.path not like 'eventos/' || new.event_id || '/%' then
    raise exception 'Ruta de archivo inválida para este evento';
  end if;
  return new;
end $$;

drop trigger if exists guard_event_material on public.event_materials;
create trigger guard_event_material before insert or update on public.event_materials
  for each row execute function public.guard_event_material();

-- Permisos
alter table public.events          enable row level security;
alter table public.event_members   enable row level security;
alter table public.event_projects  enable row level security;
alter table public.event_materials enable row level security;
alter table public.event_tasks     enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('events', 'event_members', 'event_projects', 'event_materials', 'event_tasks') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Eventos: los crean y editan docentes y líderes; los ve el equipo
create policy events_select on public.events for select to authenticated using (public.can_view_event(id));
create policy events_write  on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy event_members_select on public.event_members for select to authenticated using (public.can_view_event(event_id));
create policy event_members_write  on public.event_members for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy event_projects_select on public.event_projects for select to authenticated using (public.can_view_event(event_id));
create policy event_projects_write  on public.event_projects for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Materiales: cualquiera del equipo sube; borra quien lo subió o docentes/líderes
create policy event_materials_select on public.event_materials for select to authenticated using (public.can_view_event(event_id));
create policy event_materials_insert on public.event_materials for insert to authenticated
  with check (public.can_view_event(event_id) and author_id = auth.uid());
create policy event_materials_update on public.event_materials for update to authenticated
  using (public.is_staff() or author_id = auth.uid()) with check (public.can_view_event(event_id));
create policy event_materials_delete on public.event_materials for delete to authenticated
  using (public.is_staff() or author_id = auth.uid());

-- Preparación: el equipo agrega y tilda tareas; borran docentes/líderes
create policy event_tasks_select on public.event_tasks for select to authenticated using (public.can_view_event(event_id));
create policy event_tasks_insert on public.event_tasks for insert to authenticated with check (public.can_view_event(event_id));
create policy event_tasks_update on public.event_tasks for update to authenticated
  using (public.can_view_event(event_id)) with check (public.can_view_event(event_id));
create policy event_tasks_delete on public.event_tasks for delete to authenticated using (public.is_staff());

-- Archivos de eventos: bucket privado "proyectos", carpeta eventos/<id>/
create or replace function public.storage_event(path text) returns uuid
language plpgsql immutable as $$
begin
  if split_part(path, '/', 1) <> 'eventos' then return null; end if;
  return split_part(path, '/', 2)::uuid;
exception when others then
  return null;
end $$;

drop policy if exists eventos_select on storage.objects;
drop policy if exists eventos_insert on storage.objects;
drop policy if exists eventos_delete on storage.objects;
create policy eventos_select on storage.objects for select to authenticated
  using (bucket_id = 'proyectos' and public.can_view_event(public.storage_event(name)));
create policy eventos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'proyectos' and public.can_view_event(public.storage_event(name)));
create policy eventos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'proyectos' and public.storage_event(name) is not null and (owner = auth.uid() or public.is_staff()));

-- =====================================================================
-- Trayectoria de la web pública: dónde estuvimos, qué hicimos y qué ganamos.
-- Cada entrada tiene su propia página en la web. La web la lee sin login;
-- la editan docentes y admins desde la plataforma (Sitio web → Trayectoria).
-- Las fotos van al bucket público aero-media, carpeta trayectoria/.
-- =====================================================================
create table if not exists public.site_trayectoria (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  kind           text not null default 'competencia' check (kind in ('competencia', 'charla', 'feria', 'visita', 'otro')),
  title          text not null check (length(trim(title)) between 1 and 120),
  title_en       text not null default '' check (length(title_en) <= 120),
  place          text not null default '' check (length(place) <= 120),
  starts_on      date not null,
  ends_on        date check (ends_on is null or ends_on >= starts_on),
  achievement    text not null default '' check (length(achievement) <= 160),
  achievement_en text not null default '' check (length(achievement_en) <= 160),
  summary        text not null default '' check (length(summary) <= 400),
  summary_en     text not null default '' check (length(summary_en) <= 400),
  body           text not null default '' check (length(body) <= 8000),
  body_en        text not null default '' check (length(body_en) <= 8000),
  cover_url      text not null default '' check (cover_url = '' or cover_url ~ '^https://'),
  photos         text[] not null default '{}' check (cardinality(photos) <= 30),
  video_url      text not null default '' check (video_url = '' or video_url ~ '^https://'),
  link_url       text not null default '' check (link_url = '' or link_url ~ '^https://'),
  event_id       uuid references public.events(id) on delete set null,
  visible        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.site_trayectoria enable row level security;
drop policy if exists site_trayectoria_read on public.site_trayectoria;
drop policy if exists site_trayectoria_write on public.site_trayectoria;
create policy site_trayectoria_read on public.site_trayectoria for select to anon, authenticated
  using (visible or public.can_edit_site());
create policy site_trayectoria_write on public.site_trayectoria for all to authenticated
  using (public.can_edit_site()) with check (public.can_edit_site());

drop trigger if exists site_trayectoria_touch on public.site_trayectoria;
create trigger site_trayectoria_touch before update on public.site_trayectoria
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Imagen de marca: logos, favicons, folletos, tarjetas, imágenes y plantillas
-- del taller, para que todos los integrantes los descarguen desde la plataforma.
-- Los archivos van al bucket público "marca" (son material de difusión).
-- Ven todos los integrantes; suben, editan y borran docentes, líderes y admins.
-- =====================================================================
create table if not exists public.brand_assets (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'otros' check (category in ('logos', 'iconos', 'folletos', 'tarjetas', 'imagenes', 'plantillas', 'otros')),
  title       text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 400),
  url         text not null check (url ~ '^https://'),
  path        text not null default '',        -- ruta en el bucket "marca" (vacía si es un link externo, como Canva)
  file_name   text not null default '',
  mime        text not null default '',
  size        bigint not null default 0,
  position    integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

alter table public.brand_assets enable row level security;
drop policy if exists brand_assets_read on public.brand_assets;
drop policy if exists brand_assets_write on public.brand_assets;
create policy brand_assets_read on public.brand_assets for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()));
create policy brand_assets_write on public.brand_assets for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit)
values ('marca', 'marca', true, 26214400)  -- 25 MB por archivo
on conflict (id) do nothing;

drop policy if exists marca_insert on storage.objects;
drop policy if exists marca_update on storage.objects;
drop policy if exists marca_delete on storage.objects;
create policy marca_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'marca' and public.is_staff());
create policy marca_update on storage.objects for update to authenticated
  using (bucket_id = 'marca' and public.is_staff()) with check (bucket_id = 'marca' and public.is_staff());
create policy marca_delete on storage.objects for delete to authenticated
  using (bucket_id = 'marca' and public.is_staff());

-- Lo que ya está en la web (solo la primera vez)
do $$
declare base text := 'https://aeroglobe.wetec.um.edu.ar';
begin
  if not exists (select 1 from public.brand_assets) then
    insert into public.brand_assets (category, title, description, url, file_name, mime, position, created_by) values
      ('logos',    'Logo del encabezado',       'El logo redondo que usa la web arriba a la izquierda.',          base || '/assets/logo-encabezado.webp', 'logo-encabezado.webp', 'image/webp', 1, null),
      ('logos',    'Emblema',                   'Versión emblema del taller.',                                   base || '/assets/emblema.webp',         'emblema.webp',         'image/webp', 2, null),
      ('logos',    'Logo para fondo claro',     'Para usar sobre fondos blancos o claros.',                      base || '/assets/logo-claro.webp',      'logo-claro.webp',      'image/webp', 3, null),
      ('iconos',   'Favicon 48 px',             'Ícono de la pestaña del navegador (web pública).',              base || '/assets/favicon-48.png',       'favicon-48.png',       'image/png',  1, null),
      ('iconos',   'Ícono para iPhone',         'Apple touch icon, 180 px.',                                     base || '/assets/apple-touch-icon.png', 'apple-touch-icon.png', 'image/png',  2, null),
      ('iconos',   'Ícono de la app 512 px',    'El ícono de la plataforma instalada.',                          base || '/app/icons/icon-512.png',      'icon-512.png',         'image/png',  3, null),
      ('iconos',   'Ícono de la app 192 px',    'Versión chica del ícono de la plataforma.',                     base || '/app/icons/icon-192.png',      'icon-192.png',         'image/png',  4, null),
      ('imagenes', 'Imagen para compartir',     'La que aparece al mandar el link de la web por WhatsApp o redes.', base || '/assets/compartir.png',     'compartir.png',        'image/png',  1, null);
  end if;
end $$;

-- =====================================================================
-- Solo cuentas aprobadas: una política restrictiva en cada tabla se suma a las demás,
-- así una cuenta pendiente o rechazada no ve ni modifica nada aunque tenga el dominio.
-- La web pública (sin login) no se ve afectada. Va al final para cubrir todas las tablas.
-- =====================================================================
do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and c.relname <> 'profiles' loop
    execute format('drop policy if exists solo_aprobados on public.%I', t.relname);
    execute format('create policy solo_aprobados on public.%I as restrictive for all to authenticated '
                   'using (public.is_approved()) with check (public.is_approved())', t.relname);
  end loop;
end $$;

drop policy if exists solo_aprobados on public.profiles;
create policy solo_aprobados on public.profiles as restrictive for all to authenticated
  using (public.is_approved() or id = auth.uid()) with check (public.is_approved() or id = auth.uid());

drop policy if exists solo_aprobados on storage.objects;
create policy solo_aprobados on storage.objects as restrictive for all to authenticated
  using (public.is_approved()) with check (public.is_approved());
