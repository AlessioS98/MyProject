import React, { useState } from 'react';

export function NuovoContratto() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6  text-red-600">➕ Nuovo Contratto</h1>
      
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <p className="text-gray-500 text-center py-8 sm:py-12">
          📝 Form di creazione contratto in costruzione...
        </p>
        
        {/* Anteprima del form responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Numero Contratto *</label>
            <input type="text" className="w-full p-2 border rounded" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo Contratto *</label>
            <select className="w-full p-2 border rounded" disabled>
              <option>Seleziona...</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Inizio *</label>
            <input type="date" className="w-full p-2 border rounded" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Fine *</label>
            <input type="date" className="w-full p-2 border rounded" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Canone Mensile (€) *</label>
            <input type="number" className="w-full p-2 border rounded" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Canone Annuale (€) *</label>
            <input type="number" className="w-full p-2 border rounded" disabled />
          </div>
        </div>
        
        <div className="mt-6">
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled>
            💾 Salva Contratto
          </button>
          <p className="text-center text-sm text-gray-400 mt-2">🚧 Form in costruzione</p>
        </div>
      </div>
    </div>
  );
}