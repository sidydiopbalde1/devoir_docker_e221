
pipeline {
  agent any

  options {
    timestamps()

  }

  environment {
  
    DOCKERHUB_CREDS = credentials("dockerhub-creds") 
    RENDER_DEPLOY_HOOK = credentials("render-webhook") 
    IMAGE_NAME = "${DOCKERHUB_CREDS_USR}/mon_application_ci_cd" 
  }

  triggers {
    githubPush() // Déclenchement automatique sur push GitHub
    // pollSCM("H/5 * * * *") // Optionnel: Polling toutes les 5 minutes (peut être utile pour les dépôts non-GitHub ou en cas de problème de webhook)
  }

  stages {

    stage("Checkout") {
      steps {
        echo "📥 Récupération du code source..."
        checkout scm
      }
    }

    stage("Build & Push Docker Image") {
      steps {
        script {
          // Récupère le nom de branche fourni par Jenkins (selon le type de job)
          // BRANCH_NAME (multibranch) ou GIT_BRANCH (pipeline from SCM), fallback = 'main'
          def src = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main')

          // Sanitize pour un tag Docker valide : remplace tout caractère non autorisé par '-'
          // Ex : "feature/my-feature" -> "feature-my-feature"
          def safeTag = src.replaceAll('[^A-Za-z0-9._-]', '-')

          // Nom complet de l'image à builder/pusher
          def imageTag = "${IMAGE_NAME}:${safeTag}-${env.BUILD_NUMBER}"
          def latestImageTag = "${IMAGE_NAME}:latest"

          echo "🐳 Construction de l'image Docker: ${imageTag}"
          docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
            def app = docker.build(imageTag, '.')
            echo "📤 Publication de l'image Docker: ${imageTag}"
            app.push()
            app.push("latest") // Ajoute un tag 'latest' pour la dernière version réussie
          }
          echo "✅ Image Docker construite et publiée avec succès."
        }
      }
    }

    stage("Deploy to Render (Test Environment)") {
      steps {
        echo "🚀 Déclenchement du déploiement sur Render..."
        withCredentials([string(credentialsId: 'render-webhook', variable: 'HOOK_URL')]) {
          sh "curl -i -X POST \"${HOOK_URL}\""
        }
        echo "✅ Déploiement déclenché."
      }
    }
  }

  post {
    always {
      cleanWs() // Nettoie le workspace après chaque exécution
      echo "✨ Pipeline terminé."
    }
    success {
      echo "🎉 Succès: Le pipeline s'est terminé avec succès!"
      // Envoyer une notification par email en cas de succès (nécessite le plugin Email Extension)
       mail to: "newsdb191@gmail.com", subject: "Jenkins Build Succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}", body: "Build ${env.BUILD_NUMBER} of ${env.JOB_NAME} succeeded. Check ${env.BUILD_URL}"
    }
    failure {
      echo "❌ Échec: Le pipeline a échoué."
      // Envoyer une notification par email en cas d'échec
       mail to: "newsdb191@gmail.com", subject: "Jenkins Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}", body: "Build ${env.BUILD_NUMBER} of ${env.JOB_NAME} failed. Check ${env.BUILD_URL}"
    }
  }
}


