import React, { useState } from 'react';

export function Archivio() {
  const [mostraScaduti, setMostraScaduti] = useState(false);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold  text-red-600">📦 Archivio Contratti Scaduti</h1>
        <button
          onClick={() => setMostraScaduti(!mostraScaduti)}
          className={`px-4 py-2 rounded-lg text-sm sm:text-base transition-colors ${
            mostraScaduti 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          {mostraScaduti ? '🙈 Nascondi archivio' : '👀 Mostra archivio'}
        </button>
      </div>

      {mostraScaduti && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-center py-8 sm:py-12">
            <p className="text-4xl mb-4">🎉</p>
            <p className="text-gray-500 text-lg">Nessun contratto scaduto nell'archivio</p>
            <p className="text-sm text-gray-400 mt-2">Tutti i contratti sono attivi</p>
          </div>
        </div>
      )}
    </div>
  );
}