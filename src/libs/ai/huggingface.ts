/**
 * Hugging Face AI Service for generating audit insights
 * 
 * To use this service, you need a Hugging Face API token:
 * 1. Go to https://huggingface.co/settings/tokens
 * 2. Create a new token (free tier available)
 * 3. Add HUGGINGFACE_API_TOKEN to your .env.local file
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';

// Using a small, fast model for text generation
// Alternative models: mistralai/Mistral-7B-Instruct-v0.2, google/flan-t5-large
const TEXT_MODEL = 'google/flan-t5-base';

export type AuditDataForAI = {
  totalAudits: number;
  passRate: number;
  avgScore: number;
  scoreTrend: number;
  totalLocations: number;
  openActions: number;
  overdueActions: number;
  completedActions: number;
  topLocation?: { name: string; score: number };
  worstLocation?: { name: string; score: number };
  recentAudits: { location: string; score: number; date: string }[];
};

export type AIInsightResult = {
  summary: string;
  recommendations: string[];
  riskAnalysis: string;
  forecast: string;
  generatedAt: string;
  modelUsed: string;
};

/**
 * Check if Hugging Face API is configured
 */
export function isHuggingFaceConfigured(): boolean {
  return !!process.env.HUGGINGFACE_API_TOKEN;
}

/**
 * Generate AI-powered insights using Hugging Face
 */
export async function generateAIInsights(data: AuditDataForAI): Promise<AIInsightResult | null> {
  const apiToken = process.env.HUGGINGFACE_API_TOKEN;
  
  if (!apiToken) {
    console.warn('HUGGINGFACE_API_TOKEN not configured. Using rule-based insights.');
    return generateRuleBasedInsights(data);
  }

  try {
    // Build prompt with audit data context
    const prompt = buildInsightPrompt(data);
    
    const response = await fetch(`${HUGGINGFACE_API_URL}/${TEXT_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          do_sample: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Hugging Face API error:', error);
      // Fall back to rule-based insights
      return generateRuleBasedInsights(data);
    }

    const result = await response.json();
    const generatedText = Array.isArray(result) ? result[0]?.generated_text : result.generated_text;
    
    // Parse and structure the AI response
    return {
      summary: parseAISummary(generatedText, data),
      recommendations: generateRecommendations(data),
      riskAnalysis: generateRiskAnalysis(data),
      forecast: generateForecast(data),
      generatedAt: new Date().toISOString(),
      modelUsed: TEXT_MODEL,
    };
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    return generateRuleBasedInsights(data);
  }
}

/**
 * Build a prompt for the AI model
 */
function buildInsightPrompt(data: AuditDataForAI): string {
  return `Analyze this audit data and provide a brief insight:
- Total audits: ${data.totalAudits}
- Pass rate: ${data.passRate}%
- Average score: ${data.avgScore}%
- Score trend: ${data.scoreTrend > 0 ? 'improving' : data.scoreTrend < 0 ? 'declining' : 'stable'}
- Locations: ${data.totalLocations}
- Open actions: ${data.openActions}
- Overdue actions: ${data.overdueActions}

Provide a professional summary of the audit performance:`;
}

/**
 * Parse AI-generated text into a summary
 */
function parseAISummary(text: string, data: AuditDataForAI): string {
  // If AI generated useful text, use it; otherwise fall back to rule-based
  if (text && text.length > 20) {
    // Clean up the generated text - remove the prompt prefix
    let cleaned = text;
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex > 0 && colonIndex < 100) {
      cleaned = cleaned.substring(colonIndex + 1);
    }
    cleaned = cleaned.replace(/\n+/g, ' ').trim();
    
    if (cleaned.length > 20) {
      return cleaned;
    }
  }
  
  // Fall back to rule-based summary
  return generateRuleBasedSummary(data);
}

/**
 * Generate rule-based insights when AI is not available
 */
function generateRuleBasedInsights(data: AuditDataForAI): AIInsightResult {
  return {
    summary: generateRuleBasedSummary(data),
    recommendations: generateRecommendations(data),
    riskAnalysis: generateRiskAnalysis(data),
    forecast: generateForecast(data),
    generatedAt: new Date().toISOString(),
    modelUsed: 'rule-based',
  };
}

function generateRuleBasedSummary(data: AuditDataForAI): string {
  const parts: string[] = [];
  
  // Overall performance assessment
  if (data.passRate >= 80) {
    parts.push(`Your organization shows strong compliance performance with a ${data.passRate}% pass rate across ${data.totalAudits} audits.`);
  } else if (data.passRate >= 60) {
    parts.push(`Your audit program shows moderate performance with a ${data.passRate}% pass rate. There is room for improvement.`);
  } else {
    parts.push(`Your current ${data.passRate}% pass rate indicates significant compliance gaps that require immediate attention.`);
  }
  
  // Trend analysis
  if (data.scoreTrend > 5) {
    parts.push(`Scores are trending upward by ${data.scoreTrend}%, indicating positive momentum.`);
  } else if (data.scoreTrend < -5) {
    parts.push(`A ${Math.abs(data.scoreTrend)}% decline in scores suggests emerging issues that need addressing.`);
  }
  
  // Action status
  if (data.overdueActions > 0) {
    parts.push(`${data.overdueActions} overdue action${data.overdueActions > 1 ? 's require' : ' requires'} immediate follow-up.`);
  }
  
  return parts.join(' ');
}

function generateRecommendations(data: AuditDataForAI): string[] {
  const recommendations: string[] = [];
  
  if (data.passRate < 70) {
    recommendations.push('Focus on improving audit scores at underperforming locations through targeted training and support.');
  }
  
  if (data.overdueActions > 0) {
    recommendations.push(`Prioritize resolving ${data.overdueActions} overdue action items to improve compliance posture.`);
  }
  
  if (data.openActions > data.completedActions * 0.5) {
    recommendations.push('Consider reallocating resources to accelerate action item completion rates.');
  }
  
  if (data.scoreTrend < 0) {
    recommendations.push('Investigate root causes of declining scores and implement corrective measures.');
  }
  
  if (data.totalAudits < data.totalLocations) {
    recommendations.push('Increase audit coverage to ensure all locations are regularly assessed.');
  }
  
  // Always add at least one positive recommendation
  if (recommendations.length === 0) {
    recommendations.push('Maintain current audit frequency and continue monitoring performance trends.');
    recommendations.push('Consider sharing best practices from top-performing locations with others.');
  }
  
  return recommendations.slice(0, 4);
}

function generateRiskAnalysis(data: AuditDataForAI): string {
  const riskFactors: string[] = [];
  let riskLevel = 'Low';
  
  if (data.passRate < 50) {
    riskFactors.push('critically low pass rate');
    riskLevel = 'Critical';
  } else if (data.passRate < 70) {
    riskFactors.push('below-target pass rate');
    riskLevel = riskLevel === 'Low' ? 'Medium' : riskLevel;
  }
  
  if (data.overdueActions > 5) {
    riskFactors.push('high number of overdue actions');
    riskLevel = riskLevel === 'Low' ? 'High' : riskLevel;
  } else if (data.overdueActions > 0) {
    riskFactors.push('pending overdue actions');
    riskLevel = riskLevel === 'Low' ? 'Medium' : riskLevel;
  }
  
  if (data.scoreTrend < -10) {
    riskFactors.push('significant declining trend');
    riskLevel = riskLevel === 'Low' ? 'High' : riskLevel;
  }
  
  if (riskFactors.length === 0) {
    return `Overall risk level is Low. Your audit program is performing within acceptable parameters with no significant risk factors identified.`;
  }
  
  return `Overall risk level is ${riskLevel}. Key risk factors include: ${riskFactors.join(', ')}. Addressing these factors should be prioritized to maintain compliance standards.`;
}

function generateForecast(data: AuditDataForAI): string {
  // Simple trend-based forecast
  const predictedScore = Math.min(100, Math.max(0, data.avgScore + (data.scoreTrend * 0.5)));
  const trend = data.scoreTrend > 0 ? 'continue improving' : data.scoreTrend < 0 ? 'face challenges' : 'remain stable';
  
  return `Based on current trends, your average audit score is projected to ${trend}, reaching approximately ${Math.round(predictedScore)}% in the coming month. ${
    data.openActions > 0 
      ? `Completing the ${data.openActions} open actions could positively impact this projection.`
      : 'Maintaining current practices should help sustain this trajectory.'
  }`;
}
