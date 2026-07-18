-- Seed data for D1
INSERT INTO Groups (name) VALUES ('A24小組');

INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '破冰（超好玩遊戲）', 1);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '敬拜讚美 - 司琴/Youtube', 2);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '敬拜讚美 - 主領', 3);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '見證（經歷神）', 4);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '信息分享', 5);
INSERT INTO ServiceItems (group_id, name, display_order) VALUES (1, '報告', 6);

INSERT INTO Members (group_id, name) VALUES (1, '小明');
INSERT INTO Members (group_id, name) VALUES (1, '小華');
INSERT INTO Members (group_id, name) VALUES (1, '小美');
INSERT INTO Members (group_id, name) VALUES (1, '小強');
INSERT INTO Members (group_id, name) VALUES (1, '小玲');
