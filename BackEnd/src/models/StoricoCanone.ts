// backend/src/models/StoricoCanone.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class StoricoCanone extends Model {
  public id!: number;
  public contrattoId!: number;
  public canoneMensile!: number;
  public canoneAnnual!: number;
  public dataVariazione!: Date;
  public motivo?: string;
  public note?: string;
}

StoricoCanone.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  contrattoId: { type: DataTypes.INTEGER, allowNull: false },
  canoneMensile: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  canoneAnnual: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  dataVariazione: { type: DataTypes.DATEONLY, allowNull: false },
  motivo: { type: DataTypes.STRING },
  note: { type: DataTypes.TEXT }
}, { sequelize, modelName: 'storico_canone' });