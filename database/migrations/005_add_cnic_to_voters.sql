ALTER TABLE voters 
ADD COLUMN cnic VARCHAR(15) NOT NULL AFTER email,
ADD UNIQUE KEY unique_cnic (cnic);