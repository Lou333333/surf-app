'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DebugPredictions() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    debugDatabase()
  }, [])

  const debugDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's breaks
      const { data: breaks, error: breaksError } = await supabase
        .from('surf_breaks')
        .select('*')
        .eq('user_id', user.id)

      if (breaksError) throw breaksError

      // Get user's sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('surf_sessions')
        .select('*')
        .eq('user_id', user.id)

      if (sessionsError) throw sessionsError

      // Get all forecast data
      const { data: forecastData, error: forecastError } = await supabase
        .from('forecast_data')
        .select('*')

      if (forecastError) throw forecastError

      // Get forecast data for user's breaks only
      const breakIds = breaks.map(b => b.id)
      const userForecastData = forecastData?.filter(f => breakIds.includes(f.break_id)) || []

      // Debug info for first break
      const firstBreak = breaks[0]
      let firstBreakSessions = []
      let firstBreakForecasts = []
      let matchingForecasts = []

      if (firstBreak) {
        firstBreakSessions = sessions.filter(s => s.break_id === firstBreak.id)
        firstBreakForecasts = userForecastData.filter(f => f.break_id === firstBreak.id)
        
        // Check for matching forecast data
        for (const session of firstBreakSessions) {
          const match = firstBreakForecasts.find(f => 
            f.forecast_date === session.session_date && 
            f.forecast_time === session.session_time
          )
          if (match) {
            matchingForecasts.push({
              session: session,
              forecast: match
            })
          }
        }
      }

      setDebugInfo({
        totalBreaks: breaks.length,
        totalSessions: sessions.length,
        totalForecastData: forecastData?.length || 0,
        userForecastData: userForecastData.length,
        firstBreak: firstBreak,
        firstBreakSessions: firstBreakSessions.length,
        firstBreakForecasts: firstBreakForecasts.length,
        matchingForecasts: matchingForecasts.length,
        sampleSession: firstBreakSessions[0] || null,
        sampleForecast: firstBreakForecasts[0] || null,
        matchingData: matchingForecasts[0] || null,
        allSessions: firstBreakSessions.slice(0, 3), // First 3 sessions
        allForecasts: firstBreakForecasts.slice(0, 3) // First 3 forecasts
      })

    } catch (error) {
      console.error('Debug error:', error)
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p>Loading debug info...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-blue-500 hover:text-blue-700 mr-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Debug Predictions</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Database Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{debugInfo.totalBreaks}</div>
              <div className="text-gray-600 text-sm">Your Breaks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{debugInfo.totalSessions}</div>
              <div className="text-gray-600 text-sm">Your Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{debugInfo.totalForecastData}</div>
              <div className="text-gray-600 text-sm">Total Forecast Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{debugInfo.userForecastData}</div>
              <div className="text-gray-600 text-sm">Your Break Forecasts</div>
            </div>
          </div>
        </div>

        {debugInfo.firstBreak && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">First Break Analysis: {debugInfo.firstBreak.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{debugInfo.firstBreakSessions}</div>
                <div className="text-gray-600 text-sm">Sessions Logged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{debugInfo.firstBreakForecasts}</div>
                <div className="text-gray-600 text-sm">Forecast Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{debugInfo.matchingForecasts}</div>
                <div className="text-gray-600 text-sm">Matching Data</div>
              </div>
            </div>

            {debugInfo.matchingForecasts === 0 && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Problem Found:</strong> No forecast data matches your logged sessions. This means your scraper hasn't collected forecast data for the dates/times you surfed.
              </div>
            )}
          </div>
        )}

        {debugInfo.sampleSession && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Sample Session Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo.sampleSession, null, 2)}
            </pre>
          </div>
        )}

        {debugInfo.sampleForecast && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Sample Forecast Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo.sampleForecast, null, 2)}
            </pre>
          </div>
        )}

        {debugInfo.allSessions?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {debugInfo.allSessions.map((session: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded">
                  <div className="text-sm">
                    <strong>Date:</strong> {session.session_date} | 
                    <strong> Time:</strong> {session.session_time} | 
                    <strong> Rating:</strong> {session.rating}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {debugInfo.allForecasts?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Forecasts</h2>
            <div className="space-y-2">
              {debugInfo.allForecasts.map((forecast: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded">
                  <div className="text-sm">
                    <strong>Date:</strong> {forecast.forecast_date} | 
                    <strong> Time:</strong> {forecast.forecast_time} | 
                    <strong> Swell:</strong> {forecast.swell_height}ft | 
                    <strong> Wind:</strong> {forecast.wind_speed}kt
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <h3 className="font-semibold mb-2">Next Steps:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>If "Your Break Forecasts" is 0: Your scraper hasn't run yet or isn't working</li>
            <li>If "Matching Data" is 0: Forecast dates/times don't match your session dates/times</li>
            <li>You need at least 3-5 matching data points to generate predictions</li>
            <li>Make sure your scraper is running daily to collect current forecast data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}