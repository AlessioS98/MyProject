import React, { useState } from 'react';

export function ContrattiList() {
  const [search, setSearch] = useState('');
  const [contratti, setContratti] = useState([]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold  text-red-600">📄 Contratti</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base">
          + Nuovo contratto
        </button>
      </div>

      {/* Barra di ricerca */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Cerca per indirizzo o numero contratto..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabella - responsive */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Versione Desktop (nascosta su mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contratto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Immobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scadenza</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <p>📭 Nessun contratto presente</p>
                  <p className="text-sm mt-1">Clicca su "+ Nuovo contratto" per iniziare</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Versione Mobile (cards) */}
        <div className="md:hidden divide-y">
          <div className="p-4 text-center text-gray-500">
            <p>📭 Nessun contratto presente</p>
            <p className="text-sm mt-1">Clicca su "+ Nuovo contratto" per iniziare</p>
          </div>
        </div>
      </div>
    </div>
  );
}