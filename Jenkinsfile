pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
        RENDER_DEPLOY_HOOK_URL = credentials('render-webhook')
        RENDER_APP_URL = credentials('render-app-url')
        IMAGE_NAME = "${DOCKERHUB_CREDENTIALS_USR}/devoir_docker_e221"
        // Ne pas définir IMAGE_TAG ici, on le fera dans les stages
    }

    stages {
        stage('Checkout') {
            steps {
                echo "📥 Récupération du code source..."
                git branch: 'main', url: 'https://github.com/sidydiopbalde1/devoir_docker_e221'
                
                script {
                    // Définir les variables qui dépendent de Git
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.GIT_SHORT_COMMIT = env.GIT_COMMIT[0..7]
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHORT_COMMIT}"
                    
                    echo "Git Commit: ${env.GIT_COMMIT}"
                    echo "Image Tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                echo "🐳 Construction et publication de l'image Docker..."
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
                        // Build de l'image avec tag dynamique
                        def app = docker.build("${IMAGE_NAME}:${env.IMAGE_TAG}")
                        
                        // Push avec différents tags
                        app.push("${env.IMAGE_TAG}")           // Tag avec numéro de build
                        app.push("latest")                     // Tag latest
                        app.push("main-${env.BUILD_NUMBER}")   // Tag pour main
                        
                        echo "✅ Image pushée avec succès:"
                        echo "   - ${IMAGE_NAME}:${env.IMAGE_TAG}"
                        echo "   - ${IMAGE_NAME}:latest"
                        echo "   - ${IMAGE_NAME}:main-${env.BUILD_NUMBER}"
                    }
                }
            }
        }

        stage('Deploy to Render') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                echo "🚀 Déclenchement du déploiement sur Render..."
                script {
                    try {
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

                        // Extraction du code HTTP
                        def parts = response.split('HTTPSTATUS:')
                        def body = parts.length > 0 ? parts[0] : ""
                        def httpCode = parts.length > 1 ? parts[1] : "000"

                        echo "Response Body: ${body}"
                        echo "HTTP Code: ${httpCode}"

                        if (httpCode == "200" || httpCode == "201" || httpCode == "202") {
                            echo "✅ Déploiement déclenché avec succès (HTTP ${httpCode})"
                        } else {
                            error "❌ Erreur lors du déclenchement du déploiement (HTTP ${httpCode})"
                        }
                        
                    } catch (Exception e) {
                        error "❌ Erreur lors de l'appel du webhook Render: ${e.message}"
                    }
                }
            }
        }

        stage('Wait for Deployment') {
            steps {
                echo "⏳ Attente de la finalisation du déploiement..."
                script {
                    echo "📡 Render est en train de déployer l'application..."
                    sleep(time: 30, unit: 'SECONDS')
                    echo "⏳ Patientez encore un peu..."
                    sleep(time: 90, unit: 'SECONDS') // Total: 2 minutes
                }
            }
        }

        stage('Health Check') {
            steps {
                echo "🔍 Vérification de santé de l'application..."
                script {
                    def maxAttempts = 5
                    def success = false
                    
                    for (int i = 1; i <= maxAttempts; i++) {
                        echo "🔄 Tentative ${i}/${maxAttempts}..."
                        
                        try {
                            def healthResponse = sh(
                                script: "curl -f -s --max-time 30 '${RENDER_APP_URL}/health'",
                                returnStdout: true
                            ).trim()
                            
                            if (healthResponse) {
                                echo "✅ Application déployée et accessible!"
                                echo "🌐 URL: ${RENDER_APP_URL}"
                                echo "📄 Health Response: ${healthResponse}"
                                success = true
                                break
                            }
                        } catch (Exception e) {
                            echo "⏳ Tentative ${i} échouée: ${e.message}"
                        }
                        
                        if (i < maxAttempts) {
                            echo "⏳ Nouvelle tentative dans 30 secondes..."
                            sleep(time: 30, unit: 'SECONDS')
                        }
                    }
                    
                    if (!success) {
                        echo "⚠️ Health check échoué après ${maxAttempts} tentatives"
                        echo "ℹ️ L'application pourrait encore être en cours de démarrage"
                        // Ne pas faire échouer le build, juste un warning
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Deployment Summary') {
            steps {
                script {
                    echo """
                    🎉 ================================
                    📊 RÉSUMÉ DU DÉPLOIEMENT
                    🎉 ================================
                    
                    🏗️  Build: #${env.BUILD_NUMBER}
                    📝 Commit: ${env.GIT_SHORT_COMMIT}
                    🐳 Image: ${IMAGE_NAME}:${env.IMAGE_TAG}
                    🌐 App URL: ${RENDER_APP_URL}
                    🔍 Health: ${RENDER_APP_URL}/health
                    
                    ✨ Déploiement terminé avec succès!
                    """
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🧹 Nettoyage des ressources..."
                // Utiliser un try-catch pour éviter les erreurs
                try {
                    sh 'docker system prune -f || echo "Nettoyage Docker terminé"'
                } catch (Exception e) {
                    echo "ℹ️ Impossible de nettoyer Docker: ${e.message}"
                }
            }
        }
        success {
            echo "🎉 Pipeline exécuté avec succès!"
        }
        failure {
            echo "❌ Le pipeline a échoué"
        }
        unstable {
            echo "⚠️ Pipeline instable (probablement health check)"
        }
    }
}