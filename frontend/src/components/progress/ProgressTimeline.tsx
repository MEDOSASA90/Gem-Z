'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ApiCard, ApiButton, EmptyState, SpinnerOverlay } from '../ui/ApiComponents';

// ─── Types ──────────────────────────────────────────────────────

interface AIAnalysis {
    id: string;
    photoId: string;
    bodyFatEstimate: number | null;
    muscleMassEstimate: number | null;
    postureScore: number | null;
    symmetryScore: number | null;
    bodyComposition: Record<string, any> | null;
    recommendations: string[] | null;
    confidenceScore: number | null;
    modelVersion: string;
    analyzedAt: string;
}

interface ProgressPhoto {
    id: string;
    imageUrl: string;
    thumbnailUrl: string | null;
    photoType: string;
    angle: string | null;
    weightAtPhoto: number | null;
    bodyFatAtPhoto: number | null;
    muscleMassAtPhoto: number | null;
    notes: string | null;
    tags: string[] | null;
    aiAnalysisId: string | null;
    createdAt: string;
}

interface TimelineEntry {
    photo: ProgressPhoto;
    aiAnalysis: AIAnalysis | null;
    comparisonToPrevious: {
        weightChange: number | null;
        bodyFatChange: number | null;
        daysSinceLast: number | null;
    };
}

interface PhotoComparison {
    photoA: ProgressPhoto & { aiAnalysis?: AIAnalysis | null };
    photoB: ProgressPhoto & { aiAnalysis?: AIAnalysis | null };
    comparison: {
        weightChange: number | null;
        bodyFatChange: number | null;
        muscleMassChange: number | null;
        daysBetween: number;
        aiInsight: string | null;
    };
}

// ─── ProgressTimeline Component ─────────────────────────────────

export default function ProgressTimeline() {
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'timeline' | 'compare'>('timeline');
    const [selectedPhoto, setSelectedPhoto] = useState<TimelineEntry | null>(null);
    const [photoType, setPhotoType] = useState<string>('all');
    const [comparison, setComparison] = useState<PhotoComparison | null>(null);
    const [compareIds, setCompareIds] = useState<{ a: string; b: string }>({ a: '', b: '' });
    const [sliderValue, setSliderValue] = useState(50);

    // Upload form state
    const [imageUrl, setImageUrl] = useState('');
    const [uploadPhotoType, setUploadPhotoType] = useState('front');
    const [uploadWeight, setUploadWeight] = useState('');
    const [uploadBodyFat, setUploadBodyFat] = useState('');
    const [uploadNotes, setUploadNotes] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const getToken = () => localStorage.getItem('token') || '';

    const fetchTimeline = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const query = photoType !== 'all' ? `?photoType=${photoType}` : '';
            const res = await fetch(`/api/v1/progress/timeline${query}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success) setTimeline(data.data);
        } catch {
            setError('Failed to load timeline');
        } finally {
            setLoading(false);
        }
    }, [photoType]);

    useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

    const handleUpload = async () => {
        if (!imageUrl.trim()) {
            setError('Please enter an image URL');
            return;
        }
        setUploading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/progress/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    imageUrl,
                    photoType: uploadPhotoType,
                    weightAtPhoto: uploadWeight ? Number(uploadWeight) : null,
                    bodyFatAtPhoto: uploadBodyFat ? Number(uploadBodyFat) : null,
                    notes: uploadNotes || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Photo uploaded successfully!');
                setImageUrl('');
                setUploadWeight('');
                setUploadBodyFat('');
                setUploadNotes('');
                fetchTimeline();
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(data.message || 'Upload failed');
            }
        } catch {
            setError('Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const handleAnalyze = async (photoId: string) => {
        setAnalyzing(photoId);
        setError(null);
        try {
            const res = await fetch(`/api/v1/progress/photos/${photoId}/analyze`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('AI analysis complete!');
                fetchTimeline();
                // Refresh selected photo if open
                if (selectedPhoto?.photo.id === photoId) {
                    const analysisRes = await fetch(`/api/v1/progress/photos/${photoId}/ai-analysis`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    });
                    const analysisData = await analysisRes.json();
                    if (analysisData.success) {
                        setSelectedPhoto(prev => prev ? { ...prev, aiAnalysis: analysisData.data } : null);
                    }
                }
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(data.message || 'Analysis failed');
            }
        } catch {
            setError('Failed to run AI analysis');
        } finally {
            setAnalyzing(null);
        }
    };

    const handleCompare = async () => {
        if (!compareIds.a || !compareIds.b) {
            setError('Select two photos to compare');
            return;
        }
        setError(null);
        try {
            const res = await fetch(`/api/v1/progress/compare?photoA=${compareIds.a}&photoB=${compareIds.b}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                setComparison(data.data);
                setActiveTab('compare');
            } else {
                setError(data.message || 'Comparison failed');
            }
        } catch {
            setError('Failed to compare photos');
        }
    };

    const getPhotoIcon = (type: string) => {
        switch (type) {
            case 'front': return 'person';
            case 'back': return 'u_turn_left';
            case 'side': return 'panorama_horizontal';
            default: return 'photo_camera';
        }
    };

    if (loading) return <SpinnerOverlay text="Loading progress timeline..." />;

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00B8FF]">photo_library</span>
                        Progress Photos
                    </h1>
                    <p className="text-white/50 text-sm mt-1">Track your transformation with AI-powered analysis</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setActiveTab('timeline'); setComparison(null); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'timeline' ? 'bg-[#FFD700] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                        Timeline
                    </button>
                    <button
                        onClick={() => { setActiveTab('compare'); setComparison(null); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'compare' ? 'bg-[#FFD700] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                        Compare
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <span className="material-symbols-outlined text-green-400 text-2xl">check_circle</span>
                    <p className="text-green-400 font-bold">{successMessage}</p>
                </div>
            )}

            {/* ─── Timeline Tab ─────────────────────────────────── */}
            {activeTab === 'timeline' && (
                <div className="space-y-6">
                    {/* Upload Form */}
                    <ApiCard>
                        <h3 className="text-sm font-bold text-white/50 uppercase mb-4">Add New Photo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-white/50 text-sm block mb-1">Image URL</label>
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Photo Type</label>
                                <select
                                    value={uploadPhotoType}
                                    onChange={e => setUploadPhotoType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                                >
                                    <option value="front">Front</option>
                                    <option value="back">Back</option>
                                    <option value="side">Side</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={uploadWeight}
                                    onChange={e => setUploadWeight(e.target.value)}
                                    placeholder="70.5"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Body Fat %</label>
                                <input
                                    type="number"
                                    value={uploadBodyFat}
                                    onChange={e => setUploadBodyFat(e.target.value)}
                                    placeholder="15"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <label className="text-white/50 text-sm block mb-1">Notes</label>
                                <input
                                    type="text"
                                    value={uploadNotes}
                                    onChange={e => setUploadNotes(e.target.value)}
                                    placeholder="How are you feeling? Any changes?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/20"
                                />
                            </div>
                            <div className="flex items-end">
                                <ApiButton loading={uploading} onClick={handleUpload} className="w-full">
                                    Upload Photo
                                </ApiButton>
                            </div>
                        </div>
                    </ApiCard>

                    {/* Filter */}
                    <div className="flex gap-2">
                        {['all', 'front', 'back', 'side', 'custom'].map(type => (
                            <button
                                key={type}
                                onClick={() => setPhotoType(type)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                    photoType === type ? 'bg-[#FFD700] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                }`}
                            >
                                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Timeline Grid */}
                    {timeline.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {timeline.map((entry) => (
                                <div
                                    key={entry.photo.id}
                                    className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-[#FFD700]/30 transition-all group"
                                    onClick={() => setSelectedPhoto(selectedPhoto?.photo.id === entry.photo.id ? null : entry)}
                                >
                                    {/* Image */}
                                    <div className="relative aspect-[3/4] bg-black/40 overflow-hidden">
                                        {entry.photo.imageUrl ? (
                                            <img
                                                src={entry.photo.imageUrl}
                                                alt={`${entry.photo.photoType} view`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-4xl text-white/20">{getPhotoIcon(entry.photo.photoType)}</span>
                                            </div>
                                        )}
                                        {/* Type badge */}
                                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                                            <span className="text-white text-xs font-bold uppercase">{entry.photo.photoType}</span>
                                        </div>
                                        {/* Date */}
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                                            <span className="text-white text-xs">{new Date(entry.photo.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {/* AI badge */}
                                        {entry.aiAnalysis && (
                                            <div className="absolute bottom-3 left-3 bg-purple-500/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs text-white">auto_awesome</span>
                                                <span className="text-white text-xs font-bold">AI</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-white font-bold text-sm">
                                                {new Date(entry.photo.createdAt).toLocaleDateString('en-US', {
                                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                                })}
                                            </p>
                                            {entry.comparisonToPrevious.daysSinceLast !== null && (
                                                <span className="text-white/30 text-xs">+{entry.comparisonToPrevious.daysSinceLast} days</span>
                                            )}
                                        </div>

                                        {entry.photo.weightAtPhoto && (
                                            <p className="text-white/50 text-xs flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">monitor_weight</span>
                                                {entry.photo.weightAtPhoto} kg
                                                {entry.comparisonToPrevious.weightChange !== null && (
                                                    <span className={`ml-1 font-bold ${entry.comparisonToPrevious.weightChange < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ({entry.comparisonToPrevious.weightChange > 0 ? '+' : ''}{entry.comparisonToPrevious.weightChange.toFixed(1)})
                                                    </span>
                                                )}
                                            </p>
                                        )}

                                        {entry.photo.bodyFatAtPhoto && (
                                            <p className="text-white/50 text-xs flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">percent</span>
                                                {entry.photo.bodyFatAtPhoto}% body fat
                                                {entry.comparisonToPrevious.bodyFatChange !== null && (
                                                    <span className={`ml-1 font-bold ${entry.comparisonToPrevious.bodyFatChange < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ({entry.comparisonToPrevious.bodyFatChange > 0 ? '+' : ''}{entry.comparisonToPrevious.bodyFatChange.toFixed(1)})
                                                    </span>
                                                )}
                                            </p>
                                        )}

                                        {entry.photo.notes && (
                                            <p className="text-white/30 text-xs italic">{entry.photo.notes}</p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAnalyze(entry.photo.id); }}
                                                disabled={!!analyzing}
                                                className="flex-1 bg-purple-500/20 text-purple-400 text-xs font-bold py-2 rounded-xl hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                                {analyzing === entry.photo.id ? 'Analyzing...' : entry.aiAnalysis ? 'Re-Analyze' : 'AI Analyze'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon="photo_library" title="No photos yet" subtitle="Upload your first progress photo to get started!" />
                    )}

                    {/* Selected Photo Detail with AI */}
                    {selectedPhoto && (
                        <ApiCard>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Photo Details</h3>
                                <button onClick={() => setSelectedPhoto(null)} className="text-white/50 hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <img src={selectedPhoto.photo.imageUrl} alt="Progress" className="w-full rounded-xl" />
                                    <p className="text-white/30 text-xs mt-2 text-center">
                                        {new Date(selectedPhoto.photo.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    {selectedPhoto.aiAnalysis ? (
                                        <>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="material-symbols-outlined text-purple-400">auto_awesome</span>
                                                <h4 className="text-white font-bold">AI Analysis Results</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedPhoto.aiAnalysis.bodyFatEstimate && (
                                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                                        <p className="text-2xl font-bold text-[#00B8FF]">{selectedPhoto.aiAnalysis.bodyFatEstimate.toFixed(1)}%</p>
                                                        <p className="text-white/30 text-xs">Est. Body Fat</p>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis.muscleMassEstimate && (
                                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                                        <p className="text-2xl font-bold text-[#00FFA3]">{selectedPhoto.aiAnalysis.muscleMassEstimate.toFixed(1)}%</p>
                                                        <p className="text-white/30 text-xs">Est. Muscle Mass</p>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis.postureScore && (
                                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                                        <p className="text-2xl font-bold text-[#FFD700]">{selectedPhoto.aiAnalysis.postureScore.toFixed(0)}</p>
                                                        <p className="text-white/30 text-xs">Posture Score</p>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis.symmetryScore && (
                                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                                        <p className="text-2xl font-bold text-[#FF6B35]">{selectedPhoto.aiAnalysis.symmetryScore.toFixed(0)}</p>
                                                        <p className="text-white/30 text-xs">Symmetry Score</p>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedPhoto.aiAnalysis.bodyComposition && (
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <h5 className="text-white/50 text-xs uppercase font-bold mb-2">Body Composition</h5>
                                                    <div className="space-y-1">
                                                        {Object.entries(selectedPhoto.aiAnalysis.bodyComposition).map(([key, val]: [string, any]) => (
                                                            <div key={key} className="flex justify-between text-xs">
                                                                <span className="text-white/50 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                                <span className="text-white">{typeof val.percentage === 'number' ? val.percentage.toFixed(1) : val}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedPhoto.aiAnalysis.recommendations && (
                                                <div className="bg-white/5 rounded-xl p-3">
                                                    <h5 className="text-white/50 text-xs uppercase font-bold mb-2">AI Recommendations</h5>
                                                    <ul className="space-y-1">
                                                        {selectedPhoto.aiAnalysis.recommendations.map((rec, i) => (
                                                            <li key={i} className="text-white/60 text-xs flex items-start gap-2">
                                                                <span className="material-symbols-outlined text-xs text-[#FFD700] mt-0.5">check_circle</span>
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {selectedPhoto.aiAnalysis.confidenceScore && (
                                                <p className="text-white/30 text-xs text-center">
                                                    Confidence: {(selectedPhoto.aiAnalysis.confidenceScore * 100).toFixed(0)}% &bull; Model: {selectedPhoto.aiAnalysis.modelVersion}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <EmptyState icon="auto_awesome" title="No AI analysis yet" subtitle="Click AI Analyze to run analysis" />
                                    )}
                                </div>
                            </div>
                        </ApiCard>
                    )}
                </div>
            )}

            {/* ─── Compare Tab ──────────────────────────────────── */}
            {activeTab === 'compare' && (
                <div className="space-y-6">
                    {/* Photo Selectors */}
                    <ApiCard>
                        <h3 className="text-sm font-bold text-white/50 uppercase mb-4">Select Photos to Compare</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Photo A (Earlier)</label>
                                <select
                                    value={compareIds.a}
                                    onChange={e => setCompareIds(prev => ({ ...prev, a: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                                >
                                    <option value="">Select photo...</option>
                                    {timeline.map(t => (
                                        <option key={`a-${t.photo.id}`} value={t.photo.id}>
                                            {new Date(t.photo.createdAt).toLocaleDateString()} - {t.photo.photoType} {t.photo.weightAtPhoto ? `(${t.photo.weightAtPhoto}kg)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-white/50 text-sm block mb-1">Photo B (Later)</label>
                                <select
                                    value={compareIds.b}
                                    onChange={e => setCompareIds(prev => ({ ...prev, b: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                                >
                                    <option value="">Select photo...</option>
                                    {timeline.map(t => (
                                        <option key={`b-${t.photo.id}`} value={t.photo.id}>
                                            {new Date(t.photo.createdAt).toLocaleDateString()} - {t.photo.photoType} {t.photo.weightAtPhoto ? `(${t.photo.weightAtPhoto}kg)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <ApiButton onClick={handleCompare}>Compare</ApiButton>
                    </ApiCard>

                    {/* Comparison View */}
                    {comparison && (
                        <div className="space-y-6">
                            {/* Comparison Stats */}
                            <ApiCard>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {comparison.comparison.weightChange !== null && (
                                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                            <p className={`text-2xl font-bold ${comparison.comparison.weightChange < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {comparison.comparison.weightChange > 0 ? '+' : ''}{comparison.comparison.weightChange.toFixed(1)} kg
                                            </p>
                                            <p className="text-white/30 text-xs uppercase font-bold">Weight Change</p>
                                        </div>
                                    )}
                                    {comparison.comparison.bodyFatChange !== null && (
                                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                            <p className={`text-2xl font-bold ${comparison.comparison.bodyFatChange < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {comparison.comparison.bodyFatChange > 0 ? '+' : ''}{comparison.comparison.bodyFatChange.toFixed(1)}%
                                            </p>
                                            <p className="text-white/30 text-xs uppercase font-bold">Body Fat Change</p>
                                        </div>
                                    )}
                                    {comparison.comparison.muscleMassChange !== null && (
                                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                            <p className={`text-2xl font-bold ${comparison.comparison.muscleMassChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {comparison.comparison.muscleMassChange > 0 ? '+' : ''}{comparison.comparison.muscleMassChange.toFixed(1)}%
                                            </p>
                                            <p className="text-white/30 text-xs uppercase font-bold">Muscle Change</p>
                                        </div>
                                    )}
                                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-[#FFD700]">{comparison.comparison.daysBetween} days</p>
                                        <p className="text-white/30 text-xs uppercase font-bold">Time Between</p>
                                    </div>
                                </div>
                                {comparison.comparison.aiInsight && (
                                    <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-purple-400">auto_awesome</span>
                                        <p className="text-purple-400 text-sm">{comparison.comparison.aiInsight}</p>
                                    </div>
                                )}
                            </ApiCard>

                            {/* Side-by-Side Slider */}
                            <ApiCard>
                                <h3 className="text-sm font-bold text-white/50 uppercase mb-4">Side-by-Side</h3>
                                <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '3/4', maxHeight: '600px' }}>
                                    {/* Photo A (bottom layer - full width) */}
                                    <img
                                        src={comparison.photoA.imageUrl}
                                        alt="Before"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    {/* Photo B (top layer - clipped by slider) */}
                                    <div
                                        className="absolute inset-0 overflow-hidden"
                                        style={{ width: `${sliderValue}%` }}
                                    >
                                        <img
                                            src={comparison.photoB.imageUrl}
                                            alt="After"
                                            className="absolute inset-0 w-full h-full object-cover"
                                            style={{ width: `${100 / (sliderValue / 100 || 1)}%` }}
                                        />
                                    </div>
                                    {/* Slider Handle */}
                                    <div
                                        className="absolute top-0 bottom-0 w-1 bg-[#FFD700] cursor-ew-resize"
                                        style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)' }}
                                    >
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-black text-sm">compare_arrows</span>
                                        </div>
                                    </div>
                                    {/* Labels */}
                                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                                        <p className="text-white text-xs font-bold">{new Date(comparison.photoA.createdAt).toLocaleDateString()}</p>
                                        {comparison.photoA.weightAtPhoto && <p className="text-white/50 text-xs">{comparison.photoA.weightAtPhoto}kg</p>}
                                    </div>
                                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                                        <p className="text-white text-xs font-bold">{new Date(comparison.photoB.createdAt).toLocaleDateString()}</p>
                                        {comparison.photoB.weightAtPhoto && <p className="text-white/50 text-xs">{comparison.photoB.weightAtPhoto}kg</p>}
                                    </div>
                                </div>
                                {/* Slider control */}
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sliderValue}
                                    onChange={e => setSliderValue(Number(e.target.value))}
                                    className="w-full mt-4 accent-[#FFD700]"
                                />
                            </ApiCard>
                        </div>
                    )}

                    {timeline.length < 2 && (
                        <EmptyState icon="compare_arrows" title="Need 2+ photos" subtitle="Upload more photos to enable comparison" />
                    )}
                </div>
            )}
        </div>
    );
}
