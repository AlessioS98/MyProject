import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Scadenza extends Model {
  public id!: number;
  public contrattoId!: number;
  public tipo!: 'scadenza_contratto' | 'scadenza_registrazione';
  public dataScadenza!: Date;
  public dataPromemoria?: Date;
  public notificato!: boolean;
  public completato!: boolean;
  public note?: string;
}

Scadenza.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  contrattoId: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { 
    type: DataTypes.ENUM('scadenza_contratto', 'scadenza_registrazione'), 
    allowNull: false 
  },
  dataScadenza: { type: DataTypes.DATEONLY, allowNull: false },
  dataPromemoria: { type: DataTypes.DATEONLY },
  notificato: { type: DataTypes.BOOLEAN, defaultValue: false },
  completato: { type: DataTypes.BOOLEAN, defaultValue: false },
  note: { type: DataTypes.TEXT }
}, { 
  sequelize, 
  modelName: 'scadenza',
  tableName: 'scadenze'
});