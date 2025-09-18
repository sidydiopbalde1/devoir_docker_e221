pipeline {
    agent any

    environment {
        DOCKERHUB = credentials('dockerhub-creds')
        RENDER_DEPLOY_HOOK_URL = credentials('render-webhook')
        RENDER_APP_URL = credentials('render-app-url')
        IMAGE_NAME = "${DOCKERHUB_USR}/devoir_docker_e221"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {
        stage('🔍 Environment Check') {
            steps {
                echo "🔍 Vérification de l'environnement..."
                script {
                    echo """
                    Build Information:
                    - Job Name: ${env.JOB_NAME}
                    - Build Number: ${env.BUILD_NUMBER}
                    - Workspace: ${env.WORKSPACE}
                    """
                    
                    // Vérifications de base
                    sh 'docker --version'
                    sh 'git --version'
                    echo "✅ Outils disponibles"
                }
            }
        }

        stage('📥 Checkout') {
            steps {
                echo "📥 Récupération du code source..."
                checkout scm
                
                script {
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.GIT_SHORT_COMMIT = env.GIT_COMMIT[0..7]
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHORT_COMMIT}"
                    
                    echo """
                    Git Information:
                    - Commit: ${env.GIT_COMMIT}
                    - Short Commit: ${env.GIT_SHORT_COMMIT}
                    - Image Tag: ${env.IMAGE_TAG}
                    """
                }
            }
        }

        stage('🐳 Docker Build & Push') {
            steps {
                echo "🐳 Construction et publication de l'image Docker..."
                script {
                    try {
                        docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
                            echo "🔨 Construction de l'image ${IMAGE_NAME}:${env.IMAGE_TAG}..."
                            def app = docker.build("${IMAGE_NAME}:${env.IMAGE_TAG}")
                            
                            echo "📤 Publication vers Docker Hub..."
                            app.push("${env.IMAGE_TAG}")
                            app.push("latest")
                            app.push("build-${env.BUILD_NUMBER}")
                            
                            echo """
                            ✅ Image publiée avec succès:
                            - ${IMAGE_NAME}:${env.IMAGE_TAG}
                            - ${IMAGE_NAME}:latest  
                            - ${IMAGE_NAME}:build-${env.BUILD_NUMBER}
                            """
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
                echo "🚀 Déploiement sur Render..."
                script {
                    try {
                        echo "📡 Déclenchement du webhook Render..."
                        
                        def response = sh(
                            script: """
                                curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
                                "${RENDER_DEPLOY_HOOK_URL}" \
                                -H "Content-Type: application/json" \
                                -H "User-Agent: Jenkins-CI/${env.BUILD_NUMBER}" \
                                -d '{
                                    "clearCache": true,
                                    "imageTag": "${env.IMAGE_TAG}",
                                    "buildNumber": "${env.BUILD_NUMBER}",
                                    "gitCommit": "${env.GIT_COMMIT}"
                                }'
                            """,
                            returnStdout: true
                        ).trim()

                        // Parsing de la réponse
                        def parts = response.split('HTTPSTATUS:')
                        def body = parts.length > 0 ? parts[0] : ""
                        def httpCode = parts.length > 1 ? parts[1] : "000"

                        echo "Response Body: ${body}"
                        echo "HTTP Code: ${httpCode}"

                        if (httpCode == "200" || httpCode == "201" || httpCode == "202") {
                            echo "✅ Déploiement déclenché avec succès (HTTP ${httpCode})"
                            env.DEPLOYMENT_SUCCESS = 'true'
                        } else {
                            echo "❌ Erreur déploiement (HTTP ${httpCode}): ${body}"
                            env.DEPLOYMENT_SUCCESS = 'false'
                        }
                        
                    } catch (Exception e) {
                        echo "❌ Erreur webhook Render: ${e.message}"
                        env.DEPLOYMENT_SUCCESS = 'false'
                    }
                }
            }
        }

        stage('⏳ Wait for Deployment') {
            when {
                environment name: 'DEPLOYMENT_SUCCESS', value: 'true'
            }
            steps {
                echo "⏳ Attente du déploiement Render..."
                script {
                    echo "📡 Render traite le déploiement..."
                    sleep(time: 90, unit: 'SECONDS') // 1.5 minutes
                    echo "⏳ Prêt pour le health check..."
                }
            }
        }

        stage('🔍 Health Check') {
            steps {
                echo "🔍 Vérification de l'application..."
                script {
                    def maxAttempts = 5
                    def success = false
                    
                    for (int i = 1; i <= maxAttempts; i++) {
                        echo "🔄 Tentative ${i}/${maxAttempts}..."
                        
                        try {
                            def healthResponse = sh(
                                script: "curl -f -s --max-time 20 '${RENDER_APP_URL}/health' || echo 'FAILED'",
                                returnStdout: true
                            ).trim()
                            
                            if (healthResponse && !healthResponse.contains('FAILED')) {
                                echo "✅ Health check réussi!"
                                echo "Response: ${healthResponse}"
                                success = true
                                break
                            } else {
                                echo "⚠️ Health endpoint non accessible"
                            }
                            
                        } catch (Exception e) {
                            echo "⚠️ Erreur tentative ${i}: ${e.message}"
                        }
                        
                        if (i < maxAttempts) {
                            echo "⏳ Nouvelle tentative dans 20 secondes..."
                            sleep(time: 20, unit: 'SECONDS')
                        }
                    }
                    
                    if (success) {
                        echo "✅ Application accessible et fonctionnelle!"
                        env.HEALTH_STATUS = 'SUCCESS'
                    } else {
                        echo "⚠️ Health check échoué, mais l'application peut être en cours de démarrage"
                        env.HEALTH_STATUS = 'PARTIAL'
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('📊 Summary') {
            steps {
                script {
                    def buildDuration = currentBuild.durationString.replace(' and counting', '')
                    
                    echo """
                    🎉 ================================
                    📊 RÉSUMÉ DU DÉPLOIEMENT
                    🎉 ================================
                    
                    🏗️ Build: #${env.BUILD_NUMBER}
                    ⏱️ Durée: ${buildDuration}
                    📝 Commit: ${env.GIT_SHORT_COMMIT}
                    🐳 Image: ${IMAGE_NAME}:${env.IMAGE_TAG}
                    🚀 Déploiement: ${env.DEPLOYMENT_SUCCESS ?: 'N/A'}
                    🔍 Health Check: ${env.HEALTH_STATUS ?: 'N/A'}
                    🌐 URL: ${RENDER_APP_URL}
                    📊 Status: ${currentBuild.result ?: 'SUCCESS'}
                    
                    ✨ Pipeline terminé!
                    ================================
                    """
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🧹 Nettoyage..."
                try {
                    sh 'docker system prune -f || echo "Nettoyage Docker terminé"'
                } catch (Exception e) {
                    echo "Erreur nettoyage: ${e.message}"
                }
            }
        }
        success {
            echo "🎉 Pipeline réussi!"
        }
        failure {
            echo "❌ Pipeline échoué"
        }
        unstable {
            echo "⚠️ Pipeline instable"
        }
    }
}