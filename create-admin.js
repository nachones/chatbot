// Script temporal para crear usuario admin
// Ejecutar una sola vez y eliminar

const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

const EMAIL = 'hola@micopiloto.es';
const PASSWORD = 'Melasig40';
const NAME = 'Admin';
const USER_ID = 'user_admin_' + Date.now();

async function createAdmin() {
  try {
    const hash = await bcrypt.hash(PASSWORD, 12);
    
    db.run(
      `INSERT INTO users (id, email, password, name, company, plan, email_verified, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [USER_ID, EMAIL, hash, NAME, 'MiCopiloto', 'pro', 1],
      function(err) {
        if (err) {
          console.error('Error:', err.message);
          if (err.message.includes('UNIQUE')) {
            console.log('El usuario ya existe. Actualizando password...');
            db.run(
              `UPDATE users SET password = ?, email_verified = 1, plan = 'pro' WHERE email = ?`,
              [hash, EMAIL],
              function(err2) {
                if (err2) console.error('Error update:', err2.message);
                else console.log('Password actualizado OK');
                db.close();
              }
            );
          } else {
            db.close();
          }
        } else {
          console.log('Usuario admin creado:');
          console.log('  Email:', EMAIL);
          console.log('  ID:', USER_ID);
          console.log('  Plan: pro');
          console.log('  Verificado: si');
          db.close();
        }
      }
    );
  } catch (error) {
    console.error('Error fatal:', error);
    db.close();
  }
}

createAdmin();
