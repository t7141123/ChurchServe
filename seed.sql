-- Seed data for D1
INSERT INTO Groups (name) VALUES ('A24小組');

INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (1, '破冰', '', 1);
INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (1, '主領', '敬拜讚美(遇見神)', 2);
INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (1, '司琴/Youtube', '敬拜讚美(遇見神)', 3);
INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (1, '見證(經歷神)', '', 4);
INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (1, '信息分享', '', 5);
INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (1, '報告', '', 6);

INSERT INTO Members (group_id, name) VALUES (1, 'UserA');
INSERT INTO Members (group_id, name) VALUES (1, 'UserB');
INSERT INTO Members (group_id, name) VALUES (1, 'UserC');
INSERT INTO Members (group_id, name) VALUES (1, 'UserD');
INSERT INTO Members (group_id, name) VALUES (1, 'UserE');
