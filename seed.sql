-- Seed data for D1
INSERT INTO Groups (name) VALUES ('A24小組');

INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '破冰（超好玩遊戲）', 1);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '敬拜讚美 - 司琴/Youtube', 2);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '敬拜讚美 - 主領', 3);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '見證（經歷神）', 4);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '信息分享', 5);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '報告', 6);

INSERT INTO Members (group_id, name) VALUES (1, 'UserA');
INSERT INTO Members (group_id, name) VALUES (1, 'UserB');
INSERT INTO Members (group_id, name) VALUES (1, 'UserC');
INSERT INTO Members (group_id, name) VALUES (1, 'UserD');
INSERT INTO Members (group_id, name) VALUES (1, 'UserE');
