<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class SecurityIncident extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'incident_title',
        'detected_at',
        'occurred_at',
        'detected_by',
        'detection_method',
        'incident_type',
        'severity_level',
        'impact_level',
        'incident_description',
        'technical_details',
        'affected_systems',
        'affected_users',
        'affected_data',
        'estimated_affected_records',
        'attack_vectors',
        'threat_actors',
        'indicators_of_compromise',
        'attack_timeline',
        'attack_signature',
        'source_ip_addresses',
        'target_systems',
        'network_logs',
        'system_logs',
        'security_tool_alerts',
        'compromised_accounts',
        'privilege_levels_involved',
        'access_patterns',
        'insider_involvement',
        'confidentiality_impact',
        'integrity_impact',
        'availability_impact',
        'financial_impact',
        'business_disruption',
        'downtime_minutes',
        'status',
        'assigned_to',
        'assigned_at',
        'incident_commander',
        'response_team',
        'response_started_at',
        'contained_at',
        'eradicated_at',
        'recovered_at',
        'resolved_at',
        'closed_at',
        'containment_actions',
        'eradication_actions',
        'recovery_actions',
        'communication_log',
        'evidence_collected',
        'forensic_artifacts',
        'forensic_investigation_required',
        'forensic_investigator',
        'chain_of_custody',
        'root_cause',
        'contributing_factors',
        'vulnerabilities_exploited',
        'security_control_failures',
        'remediation_actions',
        'preventive_measures',
        'lessons_learned',
        'recommendations',
        'policy_changes_required',
        'training_required',
        'regulatory_notification_required',
        'regulatory_bodies_notified',
        'regulatory_notification_sent',
        'customer_notification_required',
        'customer_notification_sent',
        'law_enforcement_involved',
        'legal_considerations',
        'personal_data_involved',
        'gdpr_applicable',
        'gdpr_notification_deadline',
        'data_subject_notification_required',
        'affected_data_categories',
        'third_party_vendors_involved',
        'cyber_insurance_claim',
        'insurance_claim_number',
        'external_counsel_engaged',
        'public_relations_involved',
        'time_to_detection_minutes',
        'time_to_response_minutes',
        'time_to_containment_minutes',
        'time_to_resolution_minutes',
        'follow_up_required',
        'follow_up_date',
        'follow_up_actions',
        'vulnerability_patched',
        'vulnerability_patch_date',
        'security_testing_completed',
        'related_incidents',
        'similar_incidents',
        'threat_intelligence_updates',
        'playbook_updated',
        'knowledge_base_entry',
        'response_cost',
        'staff_hours_spent',
        'external_consultant_cost',
        'technology_cost',
        'business_loss',
        'stakeholders_notified',
        'executive_briefings',
        'board_notification_required',
        'public_disclosure_required',
        'public_disclosure_date',
        'reviewed_by',
        'reviewed_at',
        'review_status',
        'review_comments',
        'retention_period',
        'archived',
        'archived_at'
    ];

    protected $casts = [
        'detected_at' => 'datetime',
        'occurred_at' => 'datetime',
        'assigned_at' => 'datetime',
        'response_started_at' => 'datetime',
        'contained_at' => 'datetime',
        'eradicated_at' => 'datetime',
        'recovered_at' => 'datetime',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
        'regulatory_notification_sent' => 'datetime',
        'customer_notification_sent' => 'datetime',
        'gdpr_notification_deadline' => 'datetime',
        'follow_up_date' => 'date',
        'vulnerability_patch_date' => 'date',
        'public_disclosure_date' => 'date',
        'reviewed_at' => 'datetime',
        'archived_at' => 'datetime',
        'affected_systems' => 'array',
        'affected_users' => 'array',
        'affected_data' => 'array',
        'attack_vectors' => 'array',
        'threat_actors' => 'array',
        'indicators_of_compromise' => 'array',
        'attack_timeline' => 'array',
        'source_ip_addresses' => 'array',
        'target_systems' => 'array',
        'network_logs' => 'array',
        'system_logs' => 'array',
        'security_tool_alerts' => 'array',
        'compromised_accounts' => 'array',
        'privilege_levels_involved' => 'array',
        'access_patterns' => 'array',
        'response_team' => 'array',
        'containment_actions' => 'array',
        'eradication_actions' => 'array',
        'recovery_actions' => 'array',
        'communication_log' => 'array',
        'evidence_collected' => 'array',
        'forensic_artifacts' => 'array',
        'contributing_factors' => 'array',
        'vulnerabilities_exploited' => 'array',
        'remediation_actions' => 'array',
        'preventive_measures' => 'array',
        'recommendations' => 'array',
        'regulatory_bodies_notified' => 'array',
        'affected_data_categories' => 'array',
        'third_party_vendors_involved' => 'array',
        'follow_up_actions' => 'array',
        'related_incidents' => 'array',
        'similar_incidents' => 'array',
        'threat_intelligence_updates' => 'array',
        'stakeholders_notified' => 'array',
        'executive_briefings' => 'array',
        'insider_involvement' => 'boolean',
        'forensic_investigation_required' => 'boolean',
        'policy_changes_required' => 'boolean',
        'training_required' => 'boolean',
        'regulatory_notification_required' => 'boolean',
        'customer_notification_required' => 'boolean',
        'law_enforcement_involved' => 'boolean',
        'personal_data_involved' => 'boolean',
        'gdpr_applicable' => 'boolean',
        'data_subject_notification_required' => 'boolean',
        'cyber_insurance_claim' => 'boolean',
        'external_counsel_engaged' => 'boolean',
        'public_relations_involved' => 'boolean',
        'follow_up_required' => 'boolean',
        'vulnerability_patched' => 'boolean',
        'security_testing_completed' => 'boolean',
        'playbook_updated' => 'boolean',
        'board_notification_required' => 'boolean',
        'public_disclosure_required' => 'boolean',
        'archived' => 'boolean',
        'financial_impact' => 'decimal:2',
        'response_cost' => 'decimal:2',
        'external_consultant_cost' => 'decimal:2',
        'technology_cost' => 'decimal:2',
        'business_loss' => 'decimal:2'
    ];

    // Relationships
    public function detectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'detected_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function incidentCommander(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incident_commander');
    }

    public function forensicInvestigator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'forensic_investigator');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Status checking methods
    public function isNew(): bool
    {
        return $this->status === 'new';
    }

    public function isAssigned(): bool
    {
        return $this->status === 'assigned';
    }

    public function isInvestigating(): bool
    {
        return $this->status === 'investigating';
    }

    public function isContaining(): bool
    {
        return $this->status === 'containing';
    }

    public function isContained(): bool
    {
        return $this->contained_at !== null;
    }

    public function isResolved(): bool
    {
        return $this->status === 'resolved';
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }

    public function isFalsePositive(): bool
    {
        return $this->status === 'false_positive';
    }

    public function isActive(): bool
    {
        return !in_array($this->status, ['resolved', 'closed', 'false_positive']);
    }

    // Severity and impact assessment
    public function isCritical(): bool
    {
        return $this->severity_level === 'critical';
    }

    public function isHighSeverity(): bool
    {
        return in_array($this->severity_level, ['critical', 'high']);
    }

    public function hasMajorImpact(): bool
    {
        return in_array($this->impact_level, ['catastrophic', 'major']);
    }

    public function requiresImmediateAttention(): bool
    {
        return $this->isCritical() || $this->hasMajorImpact();
    }

    // Time calculations
    public function getTimeToDetection(): ?int
    {
        if (!$this->occurred_at || !$this->detected_at) {
            return null;
        }
        
        return $this->occurred_at->diffInMinutes($this->detected_at);
    }

    public function getTimeToResponse(): ?int
    {
        if (!$this->detected_at || !$this->response_started_at) {
            return null;
        }
        
        return $this->detected_at->diffInMinutes($this->response_started_at);
    }

    public function getTimeToContainment(): ?int
    {
        if (!$this->detected_at || !$this->contained_at) {
            return null;
        }
        
        return $this->detected_at->diffInMinutes($this->contained_at);
    }

    public function getTimeToResolution(): ?int
    {
        if (!$this->detected_at || !$this->resolved_at) {
            return null;
        }
        
        return $this->detected_at->diffInMinutes($this->resolved_at);
    }

    public function getTotalResponseTime(): ?int
    {
        if (!$this->response_started_at || !$this->closed_at) {
            return null;
        }
        
        return $this->response_started_at->diffInMinutes($this->closed_at);
    }

    // Response metrics
    public function updateResponseMetrics(): void
    {
        $this->update([
            'time_to_detection_minutes' => $this->getTimeToDetection(),
            'time_to_response_minutes' => $this->getTimeToResponse(),
            'time_to_containment_minutes' => $this->getTimeToContainment(),
            'time_to_resolution_minutes' => $this->getTimeToResolution()
        ]);
    }

    public function isWithinSLA(): bool
    {
        $slaMinutes = match($this->severity_level) {
            'critical' => 60,      // 1 hour for critical
            'high' => 240,         // 4 hours for high
            'medium' => 1440,      // 24 hours for medium
            'low' => 4320,         // 72 hours for low
            default => 1440
        };
        
        $responseTime = $this->getTimeToResponse();
        return $responseTime !== null && $responseTime <= $slaMinutes;
    }

    // Data protection and compliance
    public function requiresGDPRNotification(): bool
    {
        return $this->gdpr_applicable && 
               $this->personal_data_involved && 
               $this->hasMajorImpact();
    }

    public function getGDPRNotificationDeadline(): ?Carbon
    {
        if (!$this->requiresGDPRNotification()) {
            return null;
        }
        
        // GDPR requires notification within 72 hours
        return $this->detected_at->addHours(72);
    }

    public function isGDPRNotificationOverdue(): bool
    {
        $deadline = $this->getGDPRNotificationDeadline();
        return $deadline && $deadline->isPast() && !$this->regulatory_notification_sent;
    }

    // Cost calculation
    public function calculateTotalCost(): float
    {
        return ($this->response_cost ?? 0) + 
               ($this->external_consultant_cost ?? 0) + 
               ($this->technology_cost ?? 0) + 
               ($this->business_loss ?? 0);
    }

    public function calculateDirectCosts(): float
    {
        return ($this->response_cost ?? 0) + 
               ($this->external_consultant_cost ?? 0) + 
               ($this->technology_cost ?? 0);
    }

    // Risk assessment
    public function calculateRiskScore(): int
    {
        $severityWeight = match($this->severity_level) {
            'critical' => 40,
            'high' => 30,
            'medium' => 20,
            'low' => 10,
            'informational' => 5
        };
        
        $impactWeight = match($this->impact_level) {
            'catastrophic' => 30,
            'major' => 25,
            'moderate' => 15,
            'minor' => 10,
            'negligible' => 5
        };
        
        $dataWeight = 0;
        if ($this->personal_data_involved) $dataWeight += 15;
        if ($this->gdpr_applicable) $dataWeight += 10;
        if ($this->regulatory_notification_required) $dataWeight += 5;
        
        $systemWeight = 0;
        if (!empty($this->affected_systems)) {
            $systemWeight = min(count($this->affected_systems) * 2, 10);
        }
        
        return min(100, $severityWeight + $impactWeight + $dataWeight + $systemWeight);
    }

    // Incident workflow
    public function assignIncident(int $userId, int $commanderId = null): bool
    {
        return $this->update([
            'assigned_to' => $userId,
            'assigned_at' => now(),
            'incident_commander' => $commanderId,
            'status' => 'assigned'
        ]);
    }

    public function startResponse(): bool
    {
        if ($this->status !== 'assigned') {
            return false;
        }
        
        return $this->update([
            'response_started_at' => now(),
            'status' => 'investigating'
        ]);
    }

    public function containIncident(array $actions = []): bool
    {
        return $this->update([
            'contained_at' => now(),
            'containment_actions' => array_merge($this->containment_actions ?? [], $actions),
            'status' => 'containing'
        ]);
    }

    public function eradicateIncident(array $actions = []): bool
    {
        if (!$this->isContained()) {
            return false;
        }
        
        return $this->update([
            'eradicated_at' => now(),
            'eradication_actions' => array_merge($this->eradication_actions ?? [], $actions),
            'status' => 'eradicating'
        ]);
    }

    public function recoverFromIncident(array $actions = []): bool
    {
        return $this->update([
            'recovered_at' => now(),
            'recovery_actions' => array_merge($this->recovery_actions ?? [], $actions),
            'status' => 'recovering'
        ]);
    }

    public function resolveIncident(string $rootCause = null): bool
    {
        $updateData = [
            'resolved_at' => now(),
            'status' => 'resolved'
        ];
        
        if ($rootCause) {
            $updateData['root_cause'] = $rootCause;
        }
        
        return $this->update($updateData);
    }

    public function closeIncident(string $reviewComments = null): bool
    {
        if (!$this->isResolved()) {
            return false;
        }
        
        return $this->update([
            'closed_at' => now(),
            'status' => 'closed',
            'review_comments' => $reviewComments
        ]);
    }

    // Evidence and forensics
    public function addEvidence(array $evidence): void
    {
        $existingEvidence = $this->evidence_collected ?? [];
        $existingEvidence[] = array_merge($evidence, [
            'collected_at' => now()->toISOString(),
            'collected_by' => auth()->id()
        ]);
        
        $this->update(['evidence_collected' => $existingEvidence]);
    }

    public function requiresForensicInvestigation(): bool
    {
        return $this->forensic_investigation_required || 
               $this->law_enforcement_involved || 
               $this->isCritical();
    }

    // Communication and notifications
    public function addCommunicationLog(array $communication): void
    {
        $log = $this->communication_log ?? [];
        $log[] = array_merge($communication, [
            'timestamp' => now()->toISOString(),
            'logged_by' => auth()->id()
        ]);
        
        $this->update(['communication_log' => $log]);
    }

    public function notifyStakeholders(array $stakeholders, string $message): void
    {
        $this->addCommunicationLog([
            'type' => 'stakeholder_notification',
            'recipients' => $stakeholders,
            'message' => $message
        ]);
        
        // Update stakeholders notified
        $notified = $this->stakeholders_notified ?? [];
        $this->update(['stakeholders_notified' => array_unique(array_merge($notified, $stakeholders))]);
    }

    // Knowledge management
    public function addToKnowledgeBase(): bool
    {
        if (!$this->isResolved() || empty($this->lessons_learned)) {
            return false;
        }
        
        $knowledgeEntry = [
            'incident_type' => $this->incident_type,
            'severity' => $this->severity_level,
            'root_cause' => $this->root_cause,
            'lessons_learned' => $this->lessons_learned,
            'preventive_measures' => $this->preventive_measures,
            'indicators_of_compromise' => $this->indicators_of_compromise,
            'response_effectiveness' => $this->calculateResponseEffectiveness()
        ];
        
        return $this->update([
            'knowledge_base_entry' => json_encode($knowledgeEntry),
            'playbook_updated' => true
        ]);
    }

    private function calculateResponseEffectiveness(): string
    {
        $responseTime = $this->getTimeToResponse();
        $containmentTime = $this->getTimeToContainment();
        
        if ($responseTime <= 30 && $containmentTime <= 120) {
            return 'excellent';
        } elseif ($responseTime <= 60 && $containmentTime <= 240) {
            return 'good';
        } elseif ($responseTime <= 120 && $containmentTime <= 480) {
            return 'acceptable';
        } else {
            return 'needs_improvement';
        }
    }

    // Scopes
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['resolved', 'closed', 'false_positive']);
    }

    public function scopeCritical(Builder $query): Builder
    {
        return $query->where('severity_level', 'critical');
    }

    public function scopeHighSeverity(Builder $query): Builder
    {
        return $query->whereIn('severity_level', ['critical', 'high']);
    }

    public function scopeRequiringAttention(Builder $query): Builder
    {
        return $query->whereIn('status', ['new', 'assigned'])
                    ->whereIn('severity_level', ['critical', 'high']);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where(function($q) {
            $q->where('severity_level', 'critical')
              ->where('detected_at', '<', now()->subHour())
              ->whereNull('response_started_at');
        })->orWhere(function($q) {
            $q->where('severity_level', 'high')
              ->where('detected_at', '<', now()->subHours(4))
              ->whereNull('response_started_at');
        });
    }

    public function scopeGDPRRelevant(Builder $query): Builder
    {
        return $query->where('gdpr_applicable', true)
                    ->where('personal_data_involved', true);
    }

    public function scopeRequiringFollowUp(Builder $query): Builder
    {
        return $query->where('follow_up_required', true)
                    ->where('follow_up_date', '<=', now());
    }

    public function scopeRecentIncidents(Builder $query, int $days = 30): Builder
    {
        return $query->where('detected_at', '>=', now()->subDays($days));
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('incident_type', $type);
    }

    public function scopeAssignedTo(Builder $query, int $userId): Builder
    {
        return $query->where('assigned_to', $userId);
    }
}