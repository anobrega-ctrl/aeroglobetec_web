-- =====================================================================
-- Textos del sitio público: propuesta más natural (sin numeraciones
-- tipo "04 / ACOMPAÑAMIENTO" ni frases sobre "la página original").
--
-- Solo cambia el BORRADOR del editor. La web pública no cambia hasta que
-- alguien entre a Plataforma → Sitio web, revise la Vista previa y toque
-- "Publicar en la web". Se puede deshacer editando los textos en el editor.
-- =====================================================================

update public.aero_draft d
set content = jsonb_set(
      d.content, '{nodes}',
      coalesce(d.content->'nodes', '{}'::jsonb) || (
        select jsonb_object_agg(k, coalesce(d.content->'nodes'->k, '{}'::jsonb) || v)
        from jsonb_each($json$
        {
          "13":  {"es": "Sumate", "en": "Join us"},
          "28":  {"es": "Redes", "en": "Social"},
          "51":  {"es": "Docentes", "en": "Teachers"},
          "69":  {"es": "Organización", "en": "Organization"},
          "89":  {"es": "Instalaciones", "en": "Facilities"},
          "109": {"es": "El taller", "en": "The workshop"},

          "32":  {"es": "Redes sociales", "en": "Social media"},
          "47":  {"es": "Participar", "en": "Get involved"},
          "55":  {"es": "Equipo docente", "en": "Teaching staff"},
          "65":  {"es": "Consultas", "en": "Questions"},
          "73":  {"es": "Cómo trabajamos", "en": "How we work"},
          "84":  {"es": "Equipos", "en": "Teams"},
          "93":  {"es": "Dónde nos reunimos", "en": "Where we meet"},
          "102": {"es": "Para qué nos reunimos", "en": "Why we meet"},
          "113": {"es": "Quiénes somos", "en": "Who we are"},
          "119": {"es": "Lo que hacemos", "en": "What we do"},

          "16":  {"es": "¿Querés sumarte a AeroGlobETec? Completá el formulario de inscripción.",
                  "en": "Want to join AeroGlobETec? Fill out the sign-up form."},
          "19":  {"es": "Si te gustaría conocer el taller y participar, completá el formulario. Se abre en Google Forms.",
                  "en": "If you'd like to get to know the workshop and take part, fill out the form. It opens in Google Forms."},
          "34":  {"es": "Seguí lo que hacemos en el taller o escribinos por correo.",
                  "en": "Follow what we do at the workshop or send us an email."},
          "49":  {"es": "Si te interesa participar en las actividades del taller, completá el formulario de inscripción.",
                  "en": "If you'd like to take part in the workshop's activities, fill out the sign-up form."},
          "54":  {"es": "Los docentes que acompañan al taller y cómo contactarlos.",
                  "en": "The teachers who support the workshop and how to reach them."},
          "57":  {"es": "Podés escribirles a sus correos institucionales.",
                  "en": "You can write to their school email addresses."},
          "75":  {"es": "Así llevamos adelante cada investigación.",
                  "en": "This is how we carry out each research project."},
          "87":  {"es": "¿Querés conocer a quienes forman parte del taller y a los docentes que lo acompañan?",
                  "en": "Want to meet the people in the workshop and the teachers who support it?"},
          "121": {"es": "Lo que hacemos en cada encuentro.",
                  "en": "What we do at every meeting."},

          "29":  {"es": "Redes y <em>contacto.</em>", "en": "Social media and <em>contact.</em>"},
          "33":  {"es": "Dónde <em>encontrarnos.</em>", "en": "Where to <em>find us.</em>"},
          "48":  {"es": "Sumate <em>al taller.</em>", "en": "Join <em>the workshop.</em>"},
          "52":  {"es": "Docentes <em>del taller.</em>", "en": "Workshop <em>teachers.</em>"},
          "56":  {"es": "Quiénes acompañan <em>al taller.</em>", "en": "Who supports <em>the workshop.</em>"},
          "120": {"es": "Qué <em>hacemos.</em>", "en": "What <em>we do.</em>"}
        }
        $json$::jsonb) as e(k, v)
      )
    ),
    revision = d.revision + 1,
    updated_at = now()
where d.id = 'main';

-- Para revisar qué quedó en el borrador:
-- select key, value->>'es' from public.aero_draft, jsonb_each(content->'nodes') where id = 'main' order by key::int;
