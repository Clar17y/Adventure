select * from item_templates
where name like '%Health%';
select * from player_recipes;

update item_templates
set consumable_effect = 
'{"type": "heal_flat", "value": 400}'::jsonb
where id = 'ed6928fc-505e-410a-a51f-e0e53b412330';

select * from player_bestiary_prefixes;

select * from items;

select * from mob_templates m
inner join zones z on m.zone_id = z.id
where z.name = 'Forest Edge'
order by damage_max desc;

select * from chat_messages c
--inner join zones z on c.channel_id = z.id
order by created_at desc;
delete from chat_messages where username = 'System';
select * from chest_drop_tables;

select * from zones;
select * from player_skills;

select * from encounter_sites;

select * from zone_connections;

select * from zone_mob_families f
inner join zones z on f.zone_id = z.id
inner join mob_families m on f.mob_family_id = m.id
where z.name = 'Cave Entrance';

update zone_mob_families set max_size = 'large' 
where zone_id = 'c651aa00-395b-42bc-8be8-ba66e909d294' 
and mob_family_id = '5d42ae9e-ebb4-4046-bd73-c56e0db982c9';

select * from player_zone_discoveries;
select * from players;
update players set attribute_points = 100;
select * from boss_encounters;
update boss_encounters set next_round_at = '2026-02-15 16:38:37.624';
select * from crafting_recipes;

update world_events set zone_id = '5cf88d73-1295-4ff0-bd64-9c5a3f0d1c9f';
select * from world_events w
inner join zones z on w.zone_id = z.id;
delete from world_events;

update world_events set zone_id = '5c563402-c779-4d23-b02e-be8e75987e51' where id = '3f549a94-502f-40db-925d-03b8752c0f16';

update players set role = 'admin' where username = 'ZuKii';
select * from boss_participants;

select z.name as fromZone, z2.name as toZone from zone_connections c
inner join zones z on c.from_zone_id = z.id
inner join zones z2 on c.to_zone_id = z2.id
where z.name = 'Forest Edge';