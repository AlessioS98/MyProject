// backend/src/models/Conduttore.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Conduttore extends Model {
  public id!: number;
  public nome!: string;
  public cognome!: string;
  public codiceFiscale!: string;
  public telefono?: string;
  public email?: string;
  public indirizzo?: string;
  public note?: string;
}

Conduttore.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING, allowNull: false },
  cognome: { type: DataTypes.STRING, allowNull: false },
  codiceFiscale: { type: DataTypes.STRING, allowNull: false, unique: true },
  telefono: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  indirizzo: { type: DataTypes.STRING },
  note: { type: DataTypes.TEXT }
}, { sequelize, modelName: 'conduttore' });