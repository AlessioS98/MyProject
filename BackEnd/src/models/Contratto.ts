// backend/src/models/Contratto.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Contratto extends Model {
  public id!: number;
  public numero!: string;
  public tipoContratto!: string;
  public dataInizio!: Date;
  public dataFine!: Date;
  public canoneMensile!: number;
  public canoneAnnual!: number;  // Calcolato ma modificabile
  public caparra!: number;
  public dataRegistrazione?: Date;
  public scadenzaRegistrazione!: Date;
  public note?: string;
  public stato!: 'attivo' | 'scaduto' | 'risolto' | 'rinnovato';
}

Contratto.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numero: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },
  tipoContratto: { 
    type: DataTypes.ENUM('4+4', '3+2', 'Transitorio', 'Altro'), 
    allowNull: false 
  },
  dataInizio: { type: DataTypes.DATEONLY, allowNull: false },
  dataFine: { type: DataTypes.DATEONLY, allowNull: false },
  canoneMensile: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  canoneAnnual: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  caparra: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  dataRegistrazione: { type: DataTypes.DATEONLY },
  scadenzaRegistrazione: { type: DataTypes.DATEONLY, allowNull: false },
  note: { type: DataTypes.TEXT },
  stato: { 
    type: DataTypes.ENUM('attivo', 'scaduto', 'risolto', 'rinnovato'),
    defaultValue: 'attivo'
  }
}, { 
  sequelize, 
  modelName: 'contratto',
  hooks: {
    beforeCreate: (contratto: any) => {
      // Calcolo automatico canone annuale se non specificato
      if (!contratto.canoneAnnual) {
        contratto.canoneAnnual = contratto.canoneMensile * 12;
      }
    }
  }
});