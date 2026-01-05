import { useEffect, useState } from 'react';
import { analyzeSchedulingResults } from '../services/scheduler';

/**
 * SmartSuggestions - Analyzes scheduling results and provides actionable advice
 * Also prompts users to use the AI assistant for more help
 */
export function SmartSuggestions({ 
    suggestions, 
    members, 
    onOpenAssistant,
    currentUserEmail 
}) {
    const [analysis, setAnalysis] = useState(null);

    useEffect(() => {
        if (suggestions && members && suggestions.length > 0) {
            const result = analyzeSchedulingResults(suggestions, members);
            setAnalysis(result);
        } else {
            setAnalysis(null);
        }
    }, [suggestions, members]);

    if (!analysis || analysis.hasFullMatches) {
        // Don't show suggestions if we have full matches - success state
        return null;
    }

    // Check if current user is the main blocker
    const currentUserIsBlocker = analysis.blockerAnalysis?.some(
        b => members.find(m => m.email === currentUserEmail)?.display_name === b.name ||
             currentUserEmail?.split('@')[0] === b.name
    );

    const getBlockerInfo = () => {
        if (!analysis.blockerAnalysis?.length) return null;
        
        const topBlocker = analysis.blockerAnalysis[0];
        const isMe = members.find(m => m.email === currentUserEmail)?.display_name === topBlocker.name ||
                     currentUserEmail?.split('@')[0] === topBlocker.name;

        return { ...topBlocker, isMe };
    };

    const blockerInfo = getBlockerInfo();

    return (
        <div className="smart-suggestions-card">
            <div className="suggestions-header">
                <span className="suggestions-title">No perfect time found</span>
            </div>

            <div className="suggestions-body">
                {/* Blocker Analysis */}
                {blockerInfo && (
                    <div className={`blocker-insight ${blockerInfo.isMe ? 'is-you' : ''}`}>
                        {blockerInfo.isMe ? (
                            <>
                                <p className="blocker-message">
                                    <strong>Your availability</strong> doesn't overlap with {blockerInfo.percentage}% of potential times.
                                </p>
                                <p className="blocker-action">
                                    Consider adding an extra time window or expanding your hours.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="blocker-message">
                                    <strong>{blockerInfo.name}</strong> is unavailable for {blockerInfo.percentage}% of potential times.
                                </p>
                                <p className="blocker-action">
                                    They may need to expand their availability or you could proceed without them.
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Timezone Spread Warning */}
                {analysis.suggestions?.find(s => s.type === 'timezone_spread') && (
                    <div className="timezone-insight">
                        <p>
                            Your group spans multiple timezones. 
                            <strong> Evening times in the middle timezone</strong> often create the best overlap.
                        </p>
                    </div>
                )}

                {/* Best Partial Option */}
                {analysis.bestPartialSlot && (
                    <div className="partial-suggestion">
                        <p>
                            Best option: <strong>{analysis.bestPartialSlot.availableMembers?.length}/{members.length}</strong> members can make the first partial slot.
                        </p>
                    </div>
                )}
            </div>

            {/* Chatbot Prompt */}
            <div className="suggestions-footer">
                <button 
                    className="btn-assistant-prompt"
                    onClick={() => {
                        // Pass a contextual question based on the analysis
                        const question = blockerInfo?.isMe 
                            ? "What times should I add to my availability to find a match?"
                            : `How can we find a time that works for everyone, including ${blockerInfo?.name || 'all members'}?`;
                        onOpenAssistant(question);
                    }}
                >
                    <span>Ask AI for help</span>
                </button>
            </div>
        </div>
    );
}
