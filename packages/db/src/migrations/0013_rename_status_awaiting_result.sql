-- Custom SQL migration file, put your code below! --
UPDATE `exam` SET `status` = 'awaiting_result' WHERE `status` = 'result_available';