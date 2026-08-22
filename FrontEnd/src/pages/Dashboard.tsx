import React, { useState, useEffect } from 'react';

export function Dashboard() {
  const [stats, setStats] = useState({
    totali: 0,
    inScadenza: 0,
    canoneTotale: 0
  });

  return (
    <div className="max-w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-red-600">📊 Dashboard</h1>
      
      {/* Cards - 3 card centrate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 max-w-4xl mx-auto">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow card-animate">
          <p className="text-sm text-gray-500 mb-1">Contratti attivi</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.totali}</p>
          <p className="text-xs text-gray-400 mt-2">+0 questa settimana</p>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow card-animate" style={{animationDelay: '0.1s'}}>
          <p className="text-sm text-gray-500 mb-1">In scadenza (30gg)</p>
          <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.inScadenza}</p>
          <p className="text-xs text-gray-400 mt-2">⚠️ Da monitorare</p>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow card-animate" style={{animationDelay: '0.2s'}}>
          <p className="text-sm text-gray-500 mb-1">Canone mensile totale</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">€ {stats.canoneTotale}</p>
          <p className="text-xs text-gray-400 mt-2">💰 Entrate mensili</p>
        </div>
      </div>

      {/* Scadenze imminenti */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold  text-red-600">⏰ Scadenze imminenti</h2>
          <span className="text-sm text-gray-500 mt-1 sm:mt-0">Prossimi 30 giorni</span>
        </div>
        
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
            <p className="text-lg">🎉 Nessuna scadenza imminente</p>
            <p className="text-sm mt-1">Tutti i contratti sono in regola</p>
          </div>
        </div>
      </div>
    </div>
  );
}