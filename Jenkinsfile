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
    API_URL = 'https://api.nomadtrack.net'
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