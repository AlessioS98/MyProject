import sequelize from '../config/database';
import { Contratto } from './Contratto';
import { Locatore } from './Locatore';
import { Conduttore } from './Conduttore';
import { Immobile } from './Immobile';
import { StoricoCanone } from './StoricoCanone';
import { Scadenza } from './Scadenza';

// Inizializza tutti i modelli
const models = {
  Contratto,
  Locatore,
  Conduttore,
  Immobile,
  StoricoCanone,
  Scadenza
};

// Setup relazioni
Contratto.belongsToMany(Locatore, { 
  through: 'contratti_locatori',
  foreignKey: 'contratto_id',
  otherKey: 'locatore_id',
  as: 'locatori'
});

Locatore.belongsToMany(Contratto, { 
  through: 'contratti_locatori',
  foreignKey: 'locatore_id',
  otherKey: 'contratto_id',
  as: 'contratti'
});

Contratto.belongsToMany(Conduttore, { 
  through: 'contratti_conduttori',
  foreignKey: 'contratto_id',
  otherKey: 'conduttore_id',
  as: 'conduttori'
});

Conduttore.belongsToMany(Contratto, { 
  through: 'contratti_conduttori',
  foreignKey: 'conduttore_id',
  otherKey: 'contratto_id',
  as: 'contratti'
});

Contratto.belongsToMany(Immobile, { 
  through: 'contratti_immobili',
  foreignKey: 'contratto_id',
  otherKey: 'immobile_id',
  as: 'immobili'
});

Immobile.belongsToMany(Contratto, { 
  through: 'contratti_immobili',
  foreignKey: 'immobile_id',
  otherKey: 'contratto_id',
  as: 'contratti'
});

Contratto.hasMany(StoricoCanone, { 
  foreignKey: 'contratto_id',
  as: 'storicoCanoni'
});

StoricoCanone.belongsTo(Contratto, { 
  foreignKey: 'contratto_id',
  as: 'contratto'
});

Contratto.hasMany(Scadenza, { 
  foreignKey: 'contratto_id',
  as: 'scadenze'
});

Scadenza.belongsTo(Contratto, { 
  foreignKey: 'contratto_id',
  as: 'contratto'
});

export { sequelize, models };