SELECT DISTINCT CASE
         WHEN DATA_TYPE IN ('ENUM', 'SET') THEN NULL
         ELSE SUBSTRING_INDEX(COLUMN_TYPE, '(', 1)
       END AS column_type
FROM INFORMATION_SCHEMA.COLUMNS
ORDER BY COLUMN_TYPE;