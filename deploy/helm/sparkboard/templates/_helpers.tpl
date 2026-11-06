{{- define "sb.name" -}}{{ .Release.Name }}{{- end -}}

{{- define "sb.labels" -}}
app.kubernetes.io/part-of: sparkboard
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ include "sb.tag" . | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "sb.selector" -}}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "sb.tag" -}}{{ .Values.image.tag | default .Chart.AppVersion }}{{- end -}}

{{- define "sb.image" -}}
{{- $reg := .root.Values.image.registry -}}
{{- if $reg }}{{ $reg }}/{{ end }}sparkboard-{{ .component }}:{{ include "sb.tag" .root }}
{{- end -}}

{{- define "sb.secretName" -}}
{{- .Values.secrets.existingSecret | default (printf "%s-secrets" .Release.Name) -}}
{{- end -}}

{{/* Restricted Pod Security Standard, shared by every container. */}}
{{- define "sb.containerSecurity" -}}
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities: { drop: ["ALL"] }
  seccompProfile: { type: RuntimeDefault }
{{- end -}}

{{- define "sb.apiEnv" -}}
{{- range $k, $v := .Values.api.env }}
- name: {{ $k }}
  value: {{ $v | quote }}
{{- end }}
- name: RELEASE
  value: {{ include "sb.tag" . | quote }}
- name: DATABASE_URL
  valueFrom: { secretKeyRef: { name: {{ include "sb.secretName" . }}, key: DATABASE_URL } }
- name: ADMIN_TOKEN
  valueFrom: { secretKeyRef: { name: {{ include "sb.secretName" . }}, key: ADMIN_TOKEN, optional: true } }
- name: AI_API_KEY
  valueFrom: { secretKeyRef: { name: {{ include "sb.secretName" . }}, key: AI_API_KEY, optional: true } }
{{- end -}}
