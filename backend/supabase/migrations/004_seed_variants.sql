-- Seed MVP variants
INSERT INTO variants (id, name, rules, icon_url, rarity) VALUES
(
    uuid_generate_v4(),
    'Love Variant',
    '{"tag_limit": null, "time_restriction": null, "radius": 50, "visibility": true}'::jsonb,
    null,
    1
),
(
    uuid_generate_v4(),
    'Flirt Variant',
    '{"tag_limit": 10, "time_restriction": {"start": "18:00", "end": "23:59"}, "radius": 100, "visibility": true}'::jsonb,
    null,
    2
),
(
    uuid_generate_v4(),
    'Zombie Variant',
    '{"tag_limit": null, "time_restriction": null, "radius": 200, "visibility": false}'::jsonb,
    null,
    3
),
(
    uuid_generate_v4(),
    'Nuke Variant',
    '{"tag_limit": 1, "time_restriction": null, "radius": 500, "visibility": true}'::jsonb,
    null,
    4
),
(
    uuid_generate_v4(),
    'Invisibility Variant',
    '{"tag_limit": null, "time_restriction": null, "radius": 50, "visibility": false}'::jsonb,
    null,
    5
);

