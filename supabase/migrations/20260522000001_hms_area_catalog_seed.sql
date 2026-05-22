-- ============================================================
-- HMS AREA CATALOG — Norwegian standard entries
-- Global catalog table (no tenant_id). Covers the five
-- categories shown in HmsAreasPage: electrical, safety,
-- environment, hr, governance.
-- ON CONFLICT DO NOTHING so re-running is idempotent.
-- ============================================================

INSERT INTO public.hms_area_catalog
  (area_key, label, description, category, legal_reference, sort_order, is_active)
VALUES

-- ─────────────────────────────────────────────────────────────
-- ELEKTROFAG (sort 101–110)
-- ─────────────────────────────────────────────────────────────
(
  'el_lavspenning',
  'Lavspenningsinstallasjoner',
  'Planlegging, utførelse og kontroll av elektriske anlegg opp til 1 000 V AC / 1 500 V DC.',
  'electrical',
  'NEK 400:2022 / FEL',
  101, true
),
(
  'el_hoyspenning',
  'Høyspenningsanlegg',
  'Arbeid i og drift av elektriske anlegg over 1 000 V AC. Krever særskilt kompetanse og FSE-prosedyre.',
  'electrical',
  'FSE 2006',
  102, true
),
(
  'el_kontrollmaling',
  'Kontrollmåling og termografering',
  'Periodisk kontrollmåling, thermografering og dokumentasjon av elektriske installasjoner.',
  'electrical',
  'NEK 400:2022',
  103, true
),
(
  'el_ex_omrade',
  'Ex-klassifiserte områder',
  'Arbeid i eksplosjonsfarlige omgivelser. Krever ATEX-kompetanse og godkjent utstyr i riktig kategori.',
  'electrical',
  'ATEX / NEK EN 60079',
  104, true
),
(
  'el_jording_vern',
  'Jording og overspenningsvern',
  'Dimensjonering og utførelse av jordingssystemer, kortslutningsvern og overspenningsvern.',
  'electrical',
  'NEK 400:2022 del 4-41',
  105, true
),
(
  'el_varmepumpe',
  'Varmepumpe- og kuldeanlegg',
  'Installasjon, service og kontroll av varmepumper og kuldeanlegg inkl. håndtering av kuldemedier.',
  'electrical',
  'F-gassforordningen (EU 517/2014)',
  106, true
),
(
  'el_solcelle',
  'Solcelleanlegg (PV)',
  'Prosjektering, installasjon og idriftsettelse av solcelleanlegg tilkoblet lavspenningsnett.',
  'electrical',
  'NEK 400-7-712',
  107, true
),
(
  'el_elbil_lading',
  'Elbillading og ladeinfrastruktur',
  'Installasjon av ladestasjoner, ladenett og tilhørende sikringsanlegg for elbiler.',
  'electrical',
  'NEK 400-7-722',
  108, true
),
(
  'el_kabel_graving',
  'Kabelarbeid og graving',
  'Legging, skjøting og dokumentasjon av jordkabler. Inkluderer koordinering med ledningseiere.',
  'electrical',
  'Graveforskriften / NEK EN 50110',
  109, true
),
(
  'el_takarbeid',
  'Takarbeid og fasademontasje',
  'Elektrisk arbeid på tak og fasade, typisk ved installasjon av solceller, antenne eller belysning.',
  'electrical',
  'Forskrift om utførelse av arbeid § 17',
  110, true
),

-- ─────────────────────────────────────────────────────────────
-- SIKKERHET (sort 201–209)
-- ─────────────────────────────────────────────────────────────
(
  'sik_fallsikring',
  'Fallsikring og arbeid i høyden',
  'Sikring mot fall ved arbeid over 2 meter. Inkluderer stige, stillas, lift og taksikring.',
  'safety',
  'Forskrift om utførelse av arbeid kap. 17',
  201, true
),
(
  'sik_sja',
  'Sikker jobbanalyse (SJA)',
  'Systematisk kartlegging av risiko og sikkerhetstiltak før oppstart av ikke-rutinepreget arbeid.',
  'safety',
  'IK-HMS / AML § 3-1',
  202, true
),
(
  'sik_pvu',
  'Personlig verneutstyr (PVU)',
  'Valg, bruk og vedlikehold av hjelm, vernesko, hansker, vernebriller, hørselsvern og åndedrettsvern.',
  'safety',
  'Arbeidsutstyrforskriften / PPE-forordningen',
  203, true
),
(
  'sik_varmt_arbeid',
  'Varmt arbeid',
  'Sveising, skjæring, lodding og annet arbeid med åpen flamme eller gnistdannelse. Brannvaktkrav.',
  'safety',
  'NS 3901 / Forskrift om brannforebygging',
  204, true
),
(
  'sik_lofteoperasjoner',
  'Løfteoperasjoner og kranarbeid',
  'Planlegging og gjennomføring av løft med kran, truck og løfteredskap. Sertifikat- og inspeksjonskrav.',
  'safety',
  'Løfteforskriften / Arbeidsutstyrforskriften',
  205, true
),
(
  'sik_trange_rom',
  'Arbeid i trange og lukkede rom',
  'Sikre prosedyrer for arbeid i tanker, kummer, rørkanaler og andre rom med begrenset adkomst.',
  'safety',
  'Forskrift om utførelse av arbeid kap. 26',
  206, true
),
(
  'sik_farlige_stoffer',
  'Farlige stoffer og kjemikalier',
  'Identifikasjon, merking, lagring og sikker håndtering av farlige kjemikalier på arbeidsplassen.',
  'safety',
  'Kjemikalieforskriften / REACH / CLP',
  207, true
),
(
  'sik_trafikk',
  'Arbeid nær trafikk og vei',
  'Sikring av arbeidssone, skilting og varsling ved arbeid på eller nær vei og trafikkerte områder.',
  'safety',
  'Håndbok N301 (Vegdirektoratet)',
  208, true
),
(
  'sik_maskin',
  'Maskinsikkerhet og arbeidsutstyr',
  'Krav til bruk, kontroll og vedlikehold av maskiner, verktøy og elektrisk arbeidsutstyr.',
  'safety',
  'Maskindirektivet 2006/42/EF / Arbeidsutstyrforskriften',
  209, true
),

-- ─────────────────────────────────────────────────────────────
-- MILJØ (sort 301–306)
-- ─────────────────────────────────────────────────────────────
(
  'miljo_fgass',
  'F-gass og kuldemedier',
  'Sertifikatkrav, lekkasjesjekk, gjenvinning og rapportering for fluorholdige klimagasser.',
  'environment',
  'F-gassforordningen (EU 517/2014) / F-gassforskriften',
  301, true
),
(
  'miljo_avfall',
  'Avfallshåndtering og kildesortering',
  'Sortering, merking og levering av avfall fra elektrisk- og varmepumpearbeid, inkl. EE-avfall.',
  'environment',
  'Avfallsforskriften / EE-avfallsforskriften',
  302, true
),
(
  'miljo_kjemikalier',
  'Kjemikalier og ytre miljø',
  'Forebygging av utslipp og spill av kjemikalier, smøremidler og hydraulikkvæsker til grunn og vann.',
  'environment',
  'Forurensningsloven / REACH',
  303, true
),
(
  'miljo_stoey',
  'Støy og vibrasjoner',
  'Kartlegging og begrensning av støy- og vibrasjonsbelastning ved bruk av maskiner og verktøy.',
  'environment',
  'Støyforskriften / Forurensningsloven § 9',
  304, true
),
(
  'miljo_asbest',
  'Asbest og farlige byggematerialer',
  'Identifikasjon, håndtering og sanering av asbest og andre farlige materialer i eldre bygninger.',
  'environment',
  'Asbestforskriften (2011)',
  305, true
),
(
  'miljo_energi',
  'Energieffektivitet og klimatiltak',
  'Krav til energiytelse ved installasjon og dokumentasjon for ENOVA-støtte og TEK17-etterlevelse.',
  'environment',
  'TEK17 / ENOVA / Energiloven',
  306, true
),

-- ─────────────────────────────────────────────────────────────
-- HR (sort 401–407)
-- ─────────────────────────────────────────────────────────────
(
  'hr_arbeidstid',
  'Arbeidstid og hviletid',
  'Planlegging og registrering av arbeidstid innenfor AML-grensene. Daglig og ukentlig hviletid.',
  'hr',
  'AML kap. 10',
  401, true
),
(
  'hr_overtid',
  'Overtidsstyring',
  'Godkjenning, registrering og begrensning av overtid. Varsling ved nærming av ukentlige grenser.',
  'hr',
  'AML § 10-6',
  402, true
),
(
  'hr_opplaering',
  'HMS-opplæring og kompetanse',
  'Lovpålagt HMS-opplæring for ledere og ansatte. Fagbrev, autorisasjoner og sertifikat-oversikt.',
  'hr',
  'AML § 3-5 / FSE 2006 § 8',
  403, true
),
(
  'hr_verneombud',
  'Verneombud og arbeidsmiljøutvalg',
  'Valg, opplæring og samarbeid med verneombud. AMU-møter og referat for virksomheter med ≥50 ansatte.',
  'hr',
  'AML kap. 6 og 7',
  404, true
),
(
  'hr_sykefravær',
  'Sykefravær og IA-oppfølging',
  'Rutiner for oppfølging av sykemeldte, tilrettelegging og IA-avtale-forpliktelser.',
  'hr',
  'AML § 4-6 / IA-avtalen',
  405, true
),
(
  'hr_varsling',
  'Varsling og trakassering',
  'Rutiner for forsvarlig varsling om kritikkverdige forhold. Nulltoleranse for trakassering og mobbing.',
  'hr',
  'AML kap. 2 A',
  406, true
),
(
  'hr_ansettelse',
  'Arbeidsavtaler og ansettelsesforhold',
  'Krav til skriftlig arbeidsavtale, prøvetid, stillingsvern og midlertidige ansettelser.',
  'hr',
  'AML kap. 14',
  407, true
),

-- ─────────────────────────────────────────────────────────────
-- STYRING (sort 501–507)
-- ─────────────────────────────────────────────────────────────
(
  'sty_internkontroll',
  'Internkontroll HMS',
  'Systematisk arbeid for å sikre etterlevelse av helse-, miljø- og sikkerhetslovgivningen.',
  'governance',
  'IK-HMS-forskriften (1996)',
  501, true
),
(
  'sty_risikovurdering',
  'Risikovurdering og fareidentifikasjon',
  'Kartlegging av farer, vurdering av sannsynlighet og konsekvens, og iverksettelse av tiltak.',
  'governance',
  'AML § 3-1 / ISO 31000',
  502, true
),
(
  'sty_beredskap',
  'Beredskapsplaner og nødprosedyrer',
  'Planer for håndtering av ulykker, brann, strømutfall og andre kritiske hendelser på arbeidsstedet.',
  'governance',
  'AML § 4-1 / DSB / Brann- og eksplosjonsvernloven',
  503, true
),
(
  'sty_avvikssystem',
  'Avvikshåndtering og korrigerende tiltak',
  'Registrering, behandling og lukking av avvik, nestenulykker og forbedringspunkter.',
  'governance',
  'IK-HMS-forskriften / ISO 45001',
  504, true
),
(
  'sty_dokumentasjon',
  'Dokumentasjon og arkivering',
  'Krav til oppbevaring av installasjonsbevis, samsvarserklæringer, FDV-dokumentasjon og HMS-protokoller.',
  'governance',
  'NEK 400:2022 / IK-HMS-forskriften',
  505, true
),
(
  'sty_tilsyn',
  'Tilsyn og myndighetskontakt',
  'Håndtering av tilsyn fra Arbeidstilsynet, DSB, DLE og andre tilsynsmyndigheter.',
  'governance',
  'Arbeidstilsynsloven / El-tilsynsloven',
  506, true
),
(
  'sty_sertifisering',
  'Sertifisering og godkjenninger',
  'Oversikt over bedriftens godkjenninger: DLE-tilknytning, F-gass-sertifikat, faglig ansvarlig m.m.',
  'governance',
  'FEL / F-gassforskriften / Kuldeforskriften',
  507, true
)

ON CONFLICT (area_key) DO NOTHING;
