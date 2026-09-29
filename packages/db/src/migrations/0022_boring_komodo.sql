ALTER TABLE `meal` ADD `items` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- Texto antigo "arroz, feijão" → um item por pedaço, sem gramas.
UPDATE `meal` SET `items` = (
  WITH RECURSIVE split(part, rest) AS (
    SELECT '', `meal`.`description` || ','
    UNION ALL
    SELECT trim(substr(rest, 1, instr(rest, ',') - 1)), substr(rest, instr(rest, ',') + 1)
    FROM split WHERE rest <> ''
  )
  SELECT json_group_array(json_object('name', part, 'grams', NULL)) FROM split WHERE part <> ''
);
