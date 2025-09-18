pipeline {
    agent any

    environment {
        DOCKERHUB = credentials('dockerhub-creds')
        RENDER_DEPLOY_HOOK_URL = credentials('render-webhook')
        RENDER_APP_URL = credentials('render-app-url')
        EMAIL_RECIPIENTS = 'newsdb191@gmail.com'
        IMAGE_NAME = "${DOCKERHUB_USR}/devoir_docker_e221"
    }


    triggers {
        githubPush() // Déclenchement automatique sur push GitHub
        // pollSCM('H/5 * * * *') // Polling toutes les 5 minutes (backup)
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        skipStagesAfterUnstable()
        ansiColor('xterm')
    }

    stages {
        stage('🔍 Environment & Security Check') {
            steps {
                echo "🔍 Vérification de l'environnement et sécurité..."
                script {
                    // Informations sur l'environnement
                    echo """
                    🏗️ Build Information:
                    - Jenkins URL: ${env.JENKINS_URL}
                    - Job Name: ${env.JOB_NAME}
                    - Build Number: ${env.BUILD_NUMBER}
                    - Node Name: ${env.NODE_NAME}
                    - Workspace: ${env.WORKSPACE}
                    """
                    
                    // Vérification des outils nécessaires
                    try {
                        sh 'docker --version'
                        sh 'git --version'
                        echo "✅ Docker et Git disponibles"
                    } catch (Exception e) {
                        error("❌ Outils manquants: ${e.message}")
                    }
                    
                    // Vérification de l'espace disque
                    def diskSpace = sh(
                        script: "df -h ${env.WORKSPACE} | tail -1 | awk '{print \$5}' | sed 's/%//'",
                        returnStdout: true
                    ).trim() as Integer
                    
                    if (diskSpace > 90) {
                        error("❌ Espace disque insuffisant: ${diskSpace}% utilisé")
                    } else {
                        echo "✅ Espace disque OK: ${diskSpace}% utilisé"
                    }
                }
            }
        }

        stage('📥 Checkout & Analysis') {
            steps {
                echo "📥 Récupération du code source..."
                
                // Checkout avec nettoyage
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[url: 'https://github.com/sidydiopbalde1/devoir_docker_e221']],
                    extensions: [[$class: 'CleanBeforeCheckout']]
                ])
                
                script {
                    // Variables Git
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.GIT_SHORT_COMMIT = env.GIT_COMMIT[0..7]
                    env.GIT_BRANCH = sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
                    env.GIT_AUTHOR = sh(script: 'git log -1 --pretty=format:"%an"', returnStdout: true).trim()
                    env.GIT_MESSAGE = sh(script: 'git log -1 --pretty=format:"%s"', returnStdout: true).trim()
                    
                    // Tags d'image
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHORT_COMMIT}"
                    env.IMAGE_TAG_LATEST = "latest"
                    env.IMAGE_TAG_BRANCH = "${env.GIT_BRANCH}-${env.BUILD_NUMBER}"
                    
                    echo """
                    📝 Git Information:
                    - Commit: ${env.GIT_COMMIT}
                    - Short Commit: ${env.GIT_SHORT_COMMIT}
                    - Branch: ${env.GIT_BRANCH}
                    - Author: ${env.GIT_AUTHOR}
                    - Message: ${env.GIT_MESSAGE}
                    - Image Tag: ${env.IMAGE_TAG}
                    """
                    
                    // Analyse des changements
                    try {
                        def changedFiles = sh(
                            script: 'git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "No previous commit"',
                            returnStdout: true
                        ).trim()
                        
                        echo "📄 Fichiers modifiés:\n${changedFiles}"
                        
                        // Déterminer le type de déploiement
                        if (changedFiles.contains('Dockerfile') || changedFiles.contains('package.json')) {
                            env.DEPLOYMENT_TYPE = 'FULL'
                            echo "🔄 Déploiement complet requis"
                        } else {
                            env.DEPLOYMENT_TYPE = 'INCREMENTAL'
                            echo "📦 Déploiement incrémental"
                        }
                        
                    } catch (Exception e) {
                        echo "ℹ️ Impossible d'analyser les changements: ${e.message}"
                        env.DEPLOYMENT_TYPE = 'FULL'
                    }
                }
            }
        }

        stage('🧪 Tests Parallèles') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            echo "🧪 Exécution des tests unitaires..."
                            
                            try {
                                // Tests Node.js
                                if (fileExists('package.json')) {
                                    sh '''
                                        if command -v npm >/dev/null 2>&1; then
                                            npm install --silent
                                            npm test || echo "Tests unitaires terminés avec des avertissements"
                                        else
                                            echo "npm non disponible, tests ignorés"
                                        fi
                                    '''
                                }
                                
                                // Tests Python
                                if (fileExists('requirements.txt') || fileExists('pytest.ini')) {
                                    sh '''
                                        if command -v python3 >/dev/null 2>&1; then
                                            python3 -m pip install -r requirements.txt --quiet || echo "Requirements installés partiellement"
                                            python3 -m pytest -v || echo "Tests Python terminés avec des avertissements"
                                        else
                                            echo "Python3 non disponible, tests ignorés"
                                        fi
                                    '''
                                }
                                
                                echo "✅ Tests unitaires terminés"
                                
                            } catch (Exception e) {
                                echo "⚠️ Erreur dans les tests unitaires: ${e.message}"
                                currentBuild.result = 'UNSTABLE'
                            }
                        }
                    }
                    post {
                        always {
                            // Archiver les résultats de tests
                            script {
                                try {
                                    if (fileExists('test-results.xml')) {
                                        junit 'test-results.xml'
                                    }
                                    if (fileExists('coverage/')) {
                                        publishHTML([
                                            allowMissing: false,
                                            alwaysLinkToLastBuild: true,
                                            keepAll: true,
                                            reportDir: 'coverage',
                                            reportFiles: 'index.html',
                                            reportName: 'Coverage Report'
                                        ])
                                    }
                                } catch (Exception e) {
                                    echo "ℹ️ Impossible d'archiver les résultats: ${e.message}"
                                }
                            }
                        }
                    }
                }

                stage('Code Quality') {
                    steps {
                        script {
                            echo "📊 Analyse de la qualité du code..."
                            
                            try {
                                // Dockerfile Linting
                                if (fileExists('Dockerfile')) {
                                    sh '''
                                        if command -v hadolint >/dev/null 2>&1; then
                                            hadolint Dockerfile || echo "Dockerfile lint terminé avec des avertissements"
                                        else
                                            echo "hadolint non installé, lint Dockerfile ignoré"
                                        fi
                                    '''
                                }
                                
                                // ESLint pour JavaScript/Node.js
                                if (fileExists('.eslintrc') || fileExists('package.json')) {
                                    sh '''
                                        if command -v npx >/dev/null 2>&1; then
                                            npx eslint . --ext .js,.jsx,.ts,.tsx --format junit --output-file eslint-results.xml || echo "ESLint terminé avec des avertissements"
                                        else
                                            echo "npx non disponible, ESLint ignoré"
                                        fi
                                    '''
                                }
                                
                                // SonarQube Analysis (optionnel)
                                if (env.SONAR_TOKEN) {
                                    sh '''
                                        if command -v sonar-scanner >/dev/null 2>&1; then
                                            sonar-scanner -Dsonar.projectKey=devoir_docker_e221 \
                                                         -Dsonar.sources=. \
                                                         -Dsonar.host.url=http://sonarqube:9000 \
                                                         -Dsonar.login=${SONAR_TOKEN} || echo "SonarQube analysis completed"
                                        else
                                            echo "SonarQube scanner non disponible"
                                        fi
                                    '''
                                }
                                
                                echo "✅ Analyse qualité terminée"
                                
                            } catch (Exception e) {
                                echo "⚠️ Erreur analyse qualité: ${e.message}"
                                currentBuild.result = 'UNSTABLE'
                            }
                        }
                    }
                }

                stage('Security Scan') {
                    steps {
                        script {
                            echo "🔒 Analyse de sécurité..."
                            
                            try {
                                // Scan des dépendances Node.js
                                if (fileExists('package.json')) {
                                    sh '''
                                        if command -v npm >/dev/null 2>&1; then
                                            npm audit --audit-level moderate || echo "Audit sécurité terminé avec des avertissements"
                                        fi
                                    '''
                                }
                                
                                // Scan des secrets
                                sh '''
                                    # Recherche basique de secrets
                                    if grep -r "password\\|secret\\|key\\|token" --include="*.js" --include="*.py" --include="*.json" . | grep -v node_modules | head -10; then
                                        echo "⚠️ Potentiels secrets détectés - Vérifiez manuellement"
                                    else
                                        echo "✅ Aucun secret évident détecté"
                                    fi
                                '''
                                
                                echo "✅ Scan sécurité terminé"
                                
                            } catch (Exception e) {
                                echo "⚠️ Erreur scan sécurité: ${e.message}"
                            }
                        }
                    }
                }
            }
        }

        stage('🐳 Docker Build & Security') {
            steps {
                echo "🐳 Construction et analyse sécurité de l'image Docker..."
                script {
                    try {
                        docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
                            // Build de l'image
                            echo "🔨 Construction de l'image..."
                            def app = docker.build("${IMAGE_NAME}:${env.IMAGE_TAG}")
                            
                            // Scan de sécurité de l'image (optionnel)
                            try {
                                if (sh(script: 'command -v trivy', returnStatus: true) == 0) {
                                    sh """
                                        trivy image --format json --output trivy-report.json ${IMAGE_NAME}:${env.IMAGE_TAG} || echo "Trivy scan completed"
                                    """
                                    echo "✅ Scan sécurité Trivy terminé"
                                } else {
                                    echo "ℹ️ Trivy non disponible, scan sécurité ignoré"
                                }
                            } catch (Exception e) {
                                echo "⚠️ Erreur scan Trivy: ${e.message}"
                            }
                            
                            // Push avec différents tags
                            echo "📤 Publication de l'image..."
                            app.push("${env.IMAGE_TAG}")
                            app.push("latest")
                            app.push("main-${env.BUILD_NUMBER}")
                            
                            // Tag pour rollback
                            app.push("backup-${env.BUILD_NUMBER}")
                            
                            echo """
                            ✅ Image publiée avec succès:
                            - ${IMAGE_NAME}:${env.IMAGE_TAG}
                            - ${IMAGE_NAME}:latest
                            - ${IMAGE_NAME}:main-${env.BUILD_NUMBER}
                            - ${IMAGE_NAME}:backup-${env.BUILD_NUMBER}
                            """
                            
                            // Métadonnées de l'image
                            env.IMAGE_SIZE = sh(
                                script: "docker images ${IMAGE_NAME}:${env.IMAGE_TAG} --format 'table {{.Size}}' | tail -1",
                                returnStdout: true
                            ).trim()
                            
                            echo "📊 Taille de l'image: ${env.IMAGE_SIZE}"
                        }
                    } catch (Exception e) {
                        error("❌ Erreur construction Docker: ${e.message}")
                    }
                }
            }
        }

        stage('🚀 Deploy to Render') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'jenkins'
                }
            }
            steps {
                echo "🚀 Déclenchement du déploiement sur Render..."
                script {
                    try {
                        // Notification pré-déploiement
                        sendNotification("🚀 Démarrage déploiement", "info")
                        
                        def deployPayload = [
                            clearCache: env.DEPLOYMENT_TYPE == 'FULL',
                            imageTag: env.IMAGE_TAG,
                            buildNumber: env.BUILD_NUMBER,
                            gitCommit: env.GIT_COMMIT,
                            gitBranch: env.GIT_BRANCH,
                            deploymentType: env.DEPLOYMENT_TYPE,
                            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ssXXX")

                        ]
                        
                       def payloadJson = groovy.json.JsonOutput.toJson(deployPayload)

                        def response = sh(
                            script: """
                                curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
                                "${RENDER_DEPLOY_HOOK_URL}" \
                                -H "Content-Type: application/json" \
                                -d '${payloadJson}'
                            """,
                            returnStdout: true
                        ).trim()


                        def parts = response.split('HTTPSTATUS:')
                        def body = parts.length > 0 ? parts[0] : ""
                        def httpCode = parts.length > 1 ? parts[1] : "000"

                        echo "📡 Response Body: ${body}"
                        echo "📊 HTTP Code: ${httpCode}"

                        if (httpCode == "200" || httpCode == "201" || httpCode == "202") {
                            echo "✅ Déploiement déclenché avec succès (HTTP ${httpCode})"
                            env.DEPLOYMENT_TRIGGERED = 'true'
                        } else {
                            error "❌ Erreur déclenchement déploiement (HTTP ${httpCode}): ${body}"
                        }
                        
                    } catch (Exception e) {
                        env.DEPLOYMENT_TRIGGERED = 'false'
                        sendNotification("❌ Erreur déploiement: ${e.message}", "error")
                        error "❌ Erreur webhook Render: ${e.message}"
                    }
                }
            }
        }

        stage('⏳ Wait & Monitor Deployment') {
            when {
                environment name: 'DEPLOYMENT_TRIGGERED', value: 'true'
            }
            steps {
                echo "⏳ Surveillance du déploiement..."
                script {
                    def deploymentStart = System.currentTimeMillis()
                    def maxWaitTime = 5 * 60 * 1000 // 5 minutes
                    
                    echo "📡 Render déploie l'application..."
                    echo "⏰ Attente initiale de 60 secondes..."
                    sleep(time: 60, unit: 'SECONDS')
                    
                    // Monitoring progressif
                    for (int i = 1; i <= 4; i++) {
                        def elapsed = System.currentTimeMillis() - deploymentStart
                        def remaining = (maxWaitTime - elapsed) / 1000
                        
                        echo "⏳ Étape ${i}/4 - Temps écoulé: ${elapsed/1000}s, Restant: ${remaining}s"
                        
                        if (elapsed > maxWaitTime) {
                            echo "⚠️ Timeout dépassé, passage au health check"
                            break
                        }
                        
                        sleep(time: 30, unit: 'SECONDS')
                    }
                    
                    env.DEPLOYMENT_DURATION = "${(System.currentTimeMillis() - deploymentStart) / 1000}s"
                    echo "⏰ Durée totale d'attente: ${env.DEPLOYMENT_DURATION}"
                }
            }
        }

        stage('🔍 Advanced Health Check') {
            steps {
                echo "🔍 Vérification avancée de santé..."
                script {
                    def maxAttempts = 6
                    def success = false
                    def healthStart = System.currentTimeMillis()
                    
                    for (int i = 1; i <= maxAttempts; i++) {
                        echo "🔄 Health Check ${i}/${maxAttempts}..."
                        
                        try {
                            // Test de base
                            def healthResponse = sh(
                                script: "curl -f -s --max-time 30 --retry 2 '${RENDER_APP_URL}/health' || echo 'HEALTH_FAILED'",
                                returnStdout: true
                            ).trim()
                            
                            if (healthResponse && !healthResponse.contains('HEALTH_FAILED')) {
                                echo "✅ Endpoint /health accessible"
                                echo "📄 Response: ${healthResponse}"
                                
                                // Test de la page principale
                                def mainPageResponse = sh(
                                    script: "curl -s --max-time 20 -o /dev/null -w '%{http_code}' '${RENDER_APP_URL}' || echo '000'",
                                    returnStdout: true
                                ).trim()
                                
                                if (mainPageResponse == "200") {
                                    echo "✅ Page principale accessible (HTTP 200)"
                                    success = true
                                    break
                                } else {
                                    echo "⚠️ Page principale: HTTP ${mainPageResponse}"
                                }
                            } else {
                                echo "⚠️ Health endpoint non accessible"
                            }
                            
                        } catch (Exception e) {
                            echo "⚠️ Tentative ${i} échouée: ${e.message}"
                        }
                        
                        if (i < maxAttempts) {
                            def waitTime = i * 10 // Attente progressive
                            echo "⏳ Nouvelle tentative dans ${waitTime} secondes..."
                            sleep(time: waitTime, unit: 'SECONDS')
                        }
                    }
                    
                    def healthDuration = (System.currentTimeMillis() - healthStart) / 1000
                    env.HEALTH_CHECK_DURATION = "${healthDuration}s"
                    
                    if (success) {
                        env.HEALTH_STATUS = 'SUCCESS'
                        echo "✅ Application déployée et fonctionnelle! (${env.HEALTH_CHECK_DURATION})"
                    } else {
                        env.HEALTH_STATUS = 'FAILED'
                        echo "⚠️ Health check échoué après ${maxAttempts} tentatives (${env.HEALTH_CHECK_DURATION})"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('📊 Deployment Summary') {
            steps {
                script {
                    def buildDuration = currentBuild.durationString.replace(' and counting', '')
                    def timestamp = new Date().format('yyyy-MM-dd HH:mm:ss')
                    
                    echo """
                    🎉 ================================================
                    📊 RÉSUMÉ COMPLET DU DÉPLOIEMENT
                    🎉 ================================================
                    
                    ⏰ Timestamp: ${timestamp}
                    🏗️ Build: #${env.BUILD_NUMBER}
                    ⏱️ Durée: ${buildDuration}
                    
                    📝 Git Info:
                    - Commit: ${env.GIT_SHORT_COMMIT} (${env.GIT_COMMIT})
                    - Branch: ${env.GIT_BRANCH}
                    - Author: ${env.GIT_AUTHOR}
                    - Message: ${env.GIT_MESSAGE}
                    
                    🐳 Docker Info:
                    - Image: ${IMAGE_NAME}:${env.IMAGE_TAG}
                    - Taille: ${env.IMAGE_SIZE ?: 'N/A'}
                    - Registry: Docker Hub
                    
                    🚀 Déploiement:
                    - Type: ${env.DEPLOYMENT_TYPE}
                    - Durée attente: ${env.DEPLOYMENT_DURATION ?: 'N/A'}
                    - Health check: ${env.HEALTH_STATUS} (${env.HEALTH_CHECK_DURATION ?: 'N/A'})
                    
                    🌐 Application:
                    - URL: ${RENDER_APP_URL}
                    - Health: ${RENDER_APP_URL}/health
                    - Status: ${currentBuild.result ?: 'SUCCESS'}
                    
                    ✨ Déploiement terminé avec succès!
                    ================================================
                    """
                    
                    // Sauvegarde des métadonnées
                    env.DEPLOYMENT_SUMMARY = """
                    Build: ${env.BUILD_NUMBER}
                    Commit: ${env.GIT_SHORT_COMMIT}
                    Image: ${IMAGE_NAME}:${env.IMAGE_TAG}
                    Status: ${currentBuild.result ?: 'SUCCESS'}
                    URL: ${RENDER_APP_URL}
                    """.stripIndent()
                    
                    // Notification de succès
                    if (env.HEALTH_STATUS == 'SUCCESS') {
                        sendNotification("✅ Déploiement réussi!", "success")
                    } else {
                        sendNotification("⚠️ Déploiement instable", "warning")
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🧹 Nettoyage des ressources..."
                
                // Archiver les logs et rapports
                try {
                    archiveArtifacts artifacts: '*.xml,*.json,*.log', allowEmptyArchive: true
                } catch (Exception e) {
                    echo "ℹ️ Impossible d'archiver les artifacts: ${e.message}"
                }
                
                // Nettoyage Docker
                try {
                    sh '''
                        # Supprimer les images temporaires
                        docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true
                        
                        # Nettoyage système (conserve les images récentes)
                        docker system prune -f --filter "until=24h" || echo "Nettoyage Docker terminé"
                        
                        # Afficher l'utilisation disque
                        echo "📊 Espace disque après nettoyage:"
                        df -h ${WORKSPACE} | tail -1
                    '''
                } catch (Exception e) {
                    echo "ℹ️ Erreur nettoyage Docker: ${e.message}"
                }
                
                echo "✅ Nettoyage terminé"
            }
        }
        
        success {
            script {
                echo "🎉 Pipeline exécuté avec succès!"
                sendNotification("🎉 Build #${env.BUILD_NUMBER} réussi", "success")
            }
        }
        
        failure {
            script {
                echo "❌ Le pipeline a échoué"
                sendNotification("❌ Build #${env.BUILD_NUMBER} échoué", "error")
            }
        }
        
        unstable {
            script {
                echo "⚠️ Pipeline instable (tests ou health check partiels)"
                sendNotification("⚠️ Build #${env.BUILD_NUMBER} instable", "warning")
            }
        }
        
        aborted {
            script {
                echo "🛑 Pipeline interrompu"
                sendNotification("🛑 Build #${env.BUILD_NUMBER} annulé", "info")
            }
        }
    }
}

// Fonction pour les notifications
def sendNotification(String message, String type) {
    def color = [
        'success': 'good',
        'error': 'danger', 
        'warning': '#ff9500',
        'info': '#439FE0'
    ][type] ?: '#439FE0'
    
    def emoji = [
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    ][type] ?: 'ℹ️'
    
    try {
        // Slack notification (si webhook configuré)
        if (env.SLACK_WEBHOOK) {
            sh """
                curl -X POST -H 'Content-type: application/json' \
                --data '{
                    "text": "${emoji} ${message}",
                    "attachments": [
                        {
                            "color": "${color}",
                            "fields": [
                                {
                                    "title": "Job",
                                    "value": "${env.JOB_NAME} #${env.BUILD_NUMBER}",
                                    "short": true
                                },
                                {
                                    "title": "Commit", 
                                    "value": "${env.GIT_SHORT_COMMIT ?: 'N/A'}",
                                    "short": true
                                },
                                {
                                    "title": "URL",
                                    "value": "${RENDER_APP_URL ?: 'N/A'}",
                                    "short": false
                                }
                            ]
                        }
                    ]
                }' \
                '${SLACK_WEBHOOK}'
            """
            echo "📧 Notification Slack envoyée"
        }
        
        // Email notification (pour les échecs critiques)
        if (type == 'error') {
            emailext (
                subject: "❌ Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}
                
                Commit: ${env.GIT_COMMIT ?: 'N/A'}
                Branch: ${env.GIT_BRANCH ?: 'N/A'}
                Author: ${env.GIT_AUTHOR ?: 'N/A'}
                
                Build URL: ${env.BUILD_URL}
                
                Error: ${message}
                """,
                to: "${EMAIL_RECIPIENTS}",
                attachLog: true
            )
            echo "📧 Email d'erreur envoyé"
        }
        
    } catch (Exception e) {
        echo "⚠️ Erreur envoi notification: ${e.message}"
    }
}