ALTER TABLE sites
ADD COLUMN IF NOT EXISTS csv_type TEXT
CHECK (csv_type IN ('lm_control', 'wiline'))
DEFAULT 'lm_control';

COMMENT ON COLUMN sites.csv_type IS
'Type de centrale de paiement : lm_control ou wiline.
Une fois des données importées, ne pas changer.';