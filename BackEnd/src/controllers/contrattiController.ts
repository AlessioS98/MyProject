// backend/src/controllers/contrattiController.ts
import { Request, Response } from 'express';
import { Contratto } from '../models/Contratto';
import { Locatore } from '../models/Locatore';
import { Conduttore } from '../models/Conduttore';
import { Immobile } from '../models/Immobile';
import sequelize from '../config/database';

export const contrattiController = {
  // GET tutti i contratti
  async getAll(req: Request, res: Response) {
    try {
      const contratti = await Contratto.findAll({
        include: [
          { model: Locatore, as: 'locatori' },
          { model: Conduttore, as: 'conduttori' },
          { model: Immobile, as: 'immobili' }
        ],
        order: [['dataFine', 'ASC']]
      });
      res.json(contratti);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET contratto by ID
  async getById(req: Request, res: Response) {
    try {
      const contratto = await Contratto.findByPk(req.params.id, {
        include: [
          { model: Locatore, as: 'locatori' },
          { model: Conduttore, as: 'conduttori' },
          { model: Immobile, as: 'immobili' }
        ]
      });
      if (!contratto) {
        return res.status(404).json({ error: 'Contratto non trovato' });
      }
      res.json(contratto);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST nuovo contratto
  async create(req: Request, res: Response) {
    const transaction = await sequelize.transaction();
    
    try {
      const { locatori, conduttori, immobili, ...datiContratto } = req.body;
      
      // Crea il contratto
      const contratto = await Contratto.create(datiContratto, { transaction });
      
      // Associa locatori (se presenti)
      if (locatori && locatori.length > 0) {
        const locatoriIds = locatori.map((l: any) => l.id);
        // Usa il metodo set generato da Sequelize
        await (contratto as any).setLocatori(locatoriIds, { transaction });
      }
      
      // Associa conduttori (se presenti)
      if (conduttori && conduttori.length > 0) {
        const conduttoriIds = conduttori.map((c: any) => c.id);
        await (contratto as any).setConduttori(conduttoriIds, { transaction });
      }
      
      // Associa immobili (se presenti)
      if (immobili && immobili.length > 0) {
        const immobiliIds = immobili.map((i: any) => i.id);
        await (contratto as any).setImmobili(immobiliIds, { transaction });
      }
      
      await transaction.commit();
      
      // Ricarica il contratto con tutte le associazioni
      const contrattoCompleto = await Contratto.findByPk(contratto.id, {
        include: [
          { model: Locatore, as: 'locatori' },
          { model: Conduttore, as: 'conduttori' },
          { model: Immobile, as: 'immobili' }
        ]
      });
      
      res.status(201).json(contrattoCompleto);
    } catch (error: any) {
      await transaction.rollback();
      res.status(400).json({ error: error.message });
    }
  },

  // PUT aggiorna contratto
  async update(req: Request, res: Response) {
    const transaction = await sequelize.transaction();
    
    try {
      const contratto = await Contratto.findByPk(req.params.id);
      if (!contratto) {
        return res.status(404).json({ error: 'Contratto non trovato' });
      }
      
      const { locatori, conduttori, immobili, ...datiContratto } = req.body;
      
      // Aggiorna i dati del contratto
      await contratto.update(datiContratto, { transaction });
      
      // Aggiorna le associazioni
      if (locatori) {
        const locatoriIds = locatori.map((l: any) => l.id);
        await (contratto as any).setLocatori(locatoriIds, { transaction });
      }
      
      if (conduttori) {
        const conduttoriIds = conduttori.map((c: any) => c.id);
        await (contratto as any).setConduttori(conduttoriIds, { transaction });
      }
      
      if (immobili) {
        const immobiliIds = immobili.map((i: any) => i.id);
        await (contratto as any).setImmobili(immobiliIds, { transaction });
      }
      
      await transaction.commit();
      
      // Ricarica il contratto aggiornato
      const contrattoAggiornato = await Contratto.findByPk(contratto.id, {
        include: [
          { model: Locatore, as: 'locatori' },
          { model: Conduttore, as: 'conduttori' },
          { model: Immobile, as: 'immobili' }
        ]
      });
      
      res.json(contrattoAggiornato);
    } catch (error: any) {
      await transaction.rollback();
      res.status(400).json({ error: error.message });
    }
  },

  // DELETE contratto
  async delete(req: Request, res: Response) {
    const transaction = await sequelize.transaction();
    
    try {
      const contratto = await Contratto.findByPk(req.params.id);
      if (!contratto) {
        return res.status(404).json({ error: 'Contratto non trovato' });
      }
      
      // Rimuovi le associazioni
      await (contratto as any).setLocatori([], { transaction });
      await (contratto as any).setConduttori([], { transaction });
      await (contratto as any).setImmobili([], { transaction });
      
      // Elimina il contratto
      await contratto.destroy({ transaction });
      
      await transaction.commit();
      res.json({ message: 'Contratto eliminato con successo' });
    } catch (error: any) {
      await transaction.rollback();
      res.status(500).json({ error: error.message });
    }
  }
};