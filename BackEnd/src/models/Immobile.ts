// backend/src/models/Immobile.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Immobile extends Model {
  public id!: number;
  public indirizzo!: string;
  public civico!: string;
  public cap!: string;
  public città!: string;
  public provincia!: string;
  public mq?: number;
  public numeroVani?: number;
  public piano?: string;
  public note?: string;
}

Immobile.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  indirizzo: { type: DataTypes.STRING, allowNull: false },
  civico: { type: DataTypes.STRING, allowNull: false },
  cap: { type: DataTypes.STRING(5), allowNull: false },
  città: { type: DataTypes.STRING, allowNull: false },
  provincia: { type: DataTypes.STRING(2), allowNull: false },
  mq: { type: DataTypes.INTEGER },
  numeroVani: { type: DataTypes.INTEGER },
  piano: { type: DataTypes.STRING },
  note: { type: DataTypes.TEXT }
}, { sequelize, modelName: 'immobile' });