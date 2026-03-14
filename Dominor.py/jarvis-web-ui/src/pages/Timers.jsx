// Timers and Alarms Page
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";

export default function Timers() {
    const { runAction } = useOutletContext();

    // Loading states
    const [loading, setLoading] = useState({});
    const [results, setResults] = useState({});

    // Timer state
    const [timerMinutes, setTimerMinutes] = useState(5);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerMessage, setTimerMessage] = useState("Timer done!");
    const [activeTimers, setActiveTimers] = useState([]);

    // Alarm state
    const [alarmTime, setAlarmTime] = useState("07:30");
    const [activeAlarms, setActiveAlarms] = useState([]);

    // Calculator state
    const [calcExpression, setCalcExpression] = useState("");
    const [calcResult, setCalcResult] = useState(null);

    const handleSetTimer = async () => {
        const totalSeconds = (timerMinutes * 60) + timerSeconds;
        if (totalSeconds <= 0) return;

        setLoading(prev => ({ ...prev, timer: true }));
        const result = await runAction("set_timer", {
            seconds: totalSeconds,
            message: timerMessage
        });
        setLoading(prev => ({ ...prev, timer: false }));

        if (result.ok) {
            const newTimer = {
                id: Date.now(),
                duration: totalSeconds,
                message: timerMessage,
                startedAt: new Date().toLocaleTimeString(),
            };
            setActiveTimers(prev => [...prev, newTimer]);
            setResults(prev => ({ ...prev, timer: result.result || `Timer set for ${timerMinutes}m ${timerSeconds}s` }));
        }
    };

    const handleSetAlarm = async () => {
        if (!alarmTime) return;

        setLoading(prev => ({ ...prev, alarm: true }));
        const result = await runAction("set_alarm", { time_str: alarmTime });
        setLoading(prev => ({ ...prev, alarm: false }));

        if (result.ok) {
            const newAlarm = {
                id: Date.now(),
                time: alarmTime,
                createdAt: new Date().toLocaleTimeString(),
            };
            setActiveAlarms(prev => [...prev, newAlarm]);
            setResults(prev => ({ ...prev, alarm: result.result || `Alarm set for ${alarmTime}` }));
        }
    };

    const handleCalculate = async () => {
        if (!calcExpression.trim()) return;
        setLoading(prev => ({ ...prev, calc: true }));
        const result = await runAction("voice_calculator", { expression: calcExpression });
        setLoading(prev => ({ ...prev, calc: false }));
        if (result.ok || result.result) {
            setCalcResult(result.result);
        }
    };

    const handleGetDate = async () => {
        setLoading(prev => ({ ...prev, date: true }));
        const result = await runAction("get_date_day_info", {});
        setLoading(prev => ({ ...prev, date: false }));
        if (result.ok || result.result) {
            setResults(prev => ({ ...prev, dateTime: result.result }));
        }
    };

    const handleMotivate = async () => {
        setLoading(prev => ({ ...prev, motivate: true }));
        const result = await runAction("get_motivational_quote", {});
        setLoading(prev => ({ ...prev, motivate: false }));
        if (result.ok || result.result) {
            setResults(prev => ({ ...prev, quote: result.result }));
        }
    };

    // Preset timer buttons
    const presetTimers = [
        { label: "1 min", minutes: 1, seconds: 0 },
        { label: "5 min", minutes: 5, seconds: 0 },
        { label: "10 min", minutes: 10, seconds: 0 },
        { label: "15 min", minutes: 15, seconds: 0 },
        { label: "30 min", minutes: 30, seconds: 0 },
        { label: "1 hour", minutes: 60, seconds: 0 },
    ];

    const clearResults = () => setResults({});

    return (
        <div className="page timers-page">
            <div className="page-header">
                <h1>
                    <Icon name="Timer" size={28} />
                    Timers & Alarms
                </h1>
                <p className="subtitle">Set timers, alarms, and calculate</p>
            </div>

            {/* Quick Actions */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Zap" size={20} />
                    Quick Actions
                </h2>
                <div className="button-group">
                    <button
                        className="btn btn-info"
                        onClick={handleGetDate}
                        disabled={loading.date}
                    >
                        <Icon name="Calendar" size={16} />
                        {loading.date ? "Loading..." : "Get Date & Time"}
                    </button>
                    <button
                        className="btn btn-success"
                        onClick={handleMotivate}
                        disabled={loading.motivate}
                    >
                        <Icon name="Quote" size={16} />
                        {loading.motivate ? "Loading..." : "Motivate Me"}
                    </button>
                </div>
            </section>

            <div className="timers-grid">
                {/* Timer Section */}
                <section className="card timer-card">
                    <h2 className="card-title">
                        <Icon name="Timer" size={20} />
                        Set Timer
                    </h2>

                    <div className="time-picker">
                        <div className="time-input-group">
                            <input
                                type="number"
                                className="time-input"
                                min="0"
                                max="999"
                                value={timerMinutes}
                                onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                            />
                            <span className="time-label">min</span>
                        </div>
                        <span className="time-separator">:</span>
                        <div className="time-input-group">
                            <input
                                type="number"
                                className="time-input"
                                min="0"
                                max="59"
                                value={timerSeconds}
                                onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 0)}
                            />
                            <span className="time-label">sec</span>
                        </div>
                    </div>

                    <div className="preset-buttons">
                        {presetTimers.map((preset) => (
                            <button
                                key={preset.label}
                                className="preset-btn"
                                onClick={() => {
                                    setTimerMinutes(preset.minutes);
                                    setTimerSeconds(preset.seconds);
                                }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="form-group">
                        <label>Timer Message:</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Message when timer ends"
                            value={timerMessage}
                            onChange={(e) => setTimerMessage(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-block btn-lg"
                        onClick={handleSetTimer}
                        disabled={loading.timer || (timerMinutes === 0 && timerSeconds === 0)}
                    >
                        <Icon name="Play" size={18} />
                        {loading.timer ? "Setting..." : "Start Timer"}
                    </button>

                    {activeTimers.length > 0 && (
                        <div className="active-list">
                            <h4>Active Timers:</h4>
                            {activeTimers.map((timer) => (
                                <div key={timer.id} className="active-item">
                                    <Icon name="Timer" size={16} />
                                    <span>{Math.floor(timer.duration / 60)}m {timer.duration % 60}s - {timer.message}</span>
                                    <span className="time-info">Started: {timer.startedAt}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Alarm Section */}
                <section className="card alarm-card">
                    <h2 className="card-title">
                        <Icon name="Alarm" size={20} />
                        Set Alarm
                    </h2>

                    <div className="alarm-picker">
                        <input
                            type="time"
                            className="alarm-input"
                            value={alarmTime}
                            onChange={(e) => setAlarmTime(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-block btn-lg"
                        onClick={handleSetAlarm}
                        disabled={loading.alarm || !alarmTime}
                    >
                        <Icon name="Alarm" size={18} />
                        {loading.alarm ? "Setting..." : "Set Alarm"}
                    </button>

                    {activeAlarms.length > 0 && (
                        <div className="active-list">
                            <h4>Active Alarms:</h4>
                            {activeAlarms.map((alarm) => (
                                <div key={alarm.id} className="active-item">
                                    <Icon name="Alarm" size={16} />
                                    <span>{alarm.time}</span>
                                    <span className="time-info">Set: {alarm.createdAt}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Calculator Section */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Calculator" size={20} />
                    Calculator
                </h2>
                <div className="calc-input-group">
                    <input
                        type="text"
                        className="input input-lg calc-input"
                        placeholder="Enter expression (e.g., 25 * 4 + 10)"
                        value={calcExpression}
                        onChange={(e) => setCalcExpression(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleCalculate()}
                    />
                    <button
                        className="btn btn-success btn-lg"
                        onClick={handleCalculate}
                        disabled={loading.calc || !calcExpression.trim()}
                    >
                        {loading.calc ? "..." : "="}
                    </button>
                </div>
                {calcResult !== null && (
                    <div className="calc-result">
                        <span className="result-label">Result:</span>
                        <span className="result-value">{calcResult}</span>
                    </div>
                )}
            </section>

            {/* Results Display */}
            {Object.keys(results).length > 0 && (
                <section className="card">
                    <div className="card-header-row">
                        <h2 className="card-title">
                            <Icon name="Activity" size={20} />
                            Results
                        </h2>
                        <button className="btn btn-sm btn-secondary" onClick={clearResults}>
                            Clear
                        </button>
                    </div>
                    <div className="results-display">
                        {Object.entries(results).map(([key, value]) => (
                            <div key={key} className="result-item">
                                <strong>{key}:</strong>
                                <pre>{typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</pre>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
