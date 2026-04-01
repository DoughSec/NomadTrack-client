pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    AWS_REGION                 = 'us-east-2'
    FRONTEND_BUCKET            = 'nomadtrack-frontend-906ea42d'
    CLOUDFRONT_DISTRIBUTION_ID = 'E3CW1WFJSXVDH5'
    API_URL                    = 'https://api.nomadtrack.net/nomadTrack'
    VITE_AWS_ACCESS_KEY_ID     = credentials('VITE_AWS_ACCESS_KEY_ID')
    VITE_AWS_SECRET_ACCESS_KEY = credentials('VITE_AWS_SECRET_ACCESS_KEY')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Node') {
      steps {
        sh '''
          node -v || true
          npm -v || true
        '''
      }
    }

  stage('Install Dependencies') {
    steps {
      sh '''
        unset NODE_ENV || true
        export NODE_ENV=development
        npm ci --include=dev
      '''
    }
  }

  stage('Build Frontend') {
  steps {
    sh '''
      export VITE_API_URL="${API_URL}"
      export VITE_AWS_REGION="us-east-1"
      export VITE_AWS_LEX_BOT_ID="YNAQIVMX8J"
      export VITE_AWS_LEX_BOT_ALIAS_ID="TSTALIASID"
      export VITE_AWS_LEX_LOCALE_ID="en_US"
      export VITE_AWS_BEDROCK_AGENT_ID="DK4SQHFIAE"
      export VITE_AWS_BEDROCK_AGENT_ALIAS_ID="V9NTEBXSZY"
      export VITE_AWS_ACCESS_KEY_ID="${VITE_AWS_ACCESS_KEY_ID}"
      export VITE_AWS_SECRET_ACCESS_KEY="${VITE_AWS_SECRET_ACCESS_KEY}"
      npm run build
    '''
    }
  }

  stage('Deploy to S3') {
    steps {
      sh '''
        aws --version
        aws s3 sync ./dist "s3://${FRONTEND_BUCKET}" --delete --region "${AWS_REGION}" || \
        aws s3 sync ./build "s3://${FRONTEND_BUCKET}" --delete --region "${AWS_REGION}" || \
        aws s3 sync ./out "s3://${FRONTEND_BUCKET}" --delete --region "${AWS_REGION}"
      '''
    }
  }

    stage('Invalidate CloudFront') {
      steps {
        sh '''
          aws cloudfront create-invalidation \
            --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
            --paths "/*" \
            --region "${AWS_REGION}" || true
        '''
      }
    }
  }
}