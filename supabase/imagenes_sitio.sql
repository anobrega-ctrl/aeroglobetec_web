-- =====================================================================
-- Imágenes del sitio: usar los archivos de assets/ en lugar de copias
-- embebidas en el contenido (cada logo pesaba entre 16 y 75 KB adentro
-- del contenido publicado, que la web descarga en cada visita).
--
-- Solo reemplaza imágenes embebidas (data:...) que son los logos originales.
-- Las fotos subidas desde el editor (https://...) no se tocan.
-- Visualmente la web queda igual. Se puede correr más de una vez.
-- =====================================================================

do $$
declare
  archivos constant jsonb := '{
    "img-1": "assets/logo-encabezado.webp",
    "img-5": "assets/logo-encabezado.webp",
    "img-2": "assets/emblema.webp",
    "img-4": "assets/emblema.webp",
    "img-3": "assets/logo-claro.webp"
  }';
  k text;
begin
  for k in select jsonb_object_keys(archivos) loop
    update public.aero_draft
       set content = jsonb_set(content, array['images', k], archivos->k)
     where id = 'main' and content->'images'->>k like 'data:image/%';
    update public.aero_published
       set content = jsonb_set(content, array['images', k], archivos->k)
     where id = 'main' and content->'images'->>k like 'data:image/%';
  end loop;
end $$;

-- Tamaño del contenido después del cambio:
-- select id, pg_size_pretty(pg_column_size(content)::bigint) from public.aero_published;
