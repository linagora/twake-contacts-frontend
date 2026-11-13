pipeline {
    agent any

    tools {
        nodejs 'nodejs_24'
    }

    options {
        // Configure an overall timeout for the build.
        timeout(time: 1, unit: 'HOURS')
        disableConcurrentBuilds()
    }
    
    // No pipeline-level credentials: every stage up to the deploy runs code of the checked out
    // sources (npm lifecycle scripts, package.json scripts, tests). The secrets are bound only
    // around the steps that need them, see withGithubCredential and withDockerHubLogin.
    stages {
      stage('Authorize fork') {
        // A fork pull request runs no code of its own before an org member vouches for its
        // head commit: the owner of the fork is a linagora member, or a member submitted a
        // review on that very commit (approval, or a review comment 'Build this please').
        when {
          changeRequest()
          expression { env.CHANGE_FORK != null }
        }
        steps {
          script {
            authorizeFork()
          }
        }
      }
      stage('Compile') {
          steps {
            sh 'npm ci'
            // one range per dependency across the workspaces
            sh 'npm run lint:deps'
            // fail on known high-severity vulnerabilities of the shipped dependencies
            sh 'npm audit --omit=dev --audit-level=high'
          }
      }
      // cheap checks first, so that they fail before the tests run
      stage('Check Lint') {
        steps {
          sh 'npm run lint'
        }
      }
      stage('Check Formatting') {
        steps {
          sh 'npm run lint:fmt'
        }
      }
      stage('Typecheck') {
        steps {
          sh 'npm run typecheck'
        }
      }
      stage('Test') {
        steps {
          sh 'npm run test'
        }
      }
      stage('E2E') {
        // The stack of e2e/docker/ (Sabre, side service, Dex, ...) and the production image of
        // the app; the browser reaches the containers by their IP: needs a Linux agent with Docker
        environment {
          CI = 'true'
        }
        steps {
          script {
            // one compose project per build: builds of other branches may share the agent
            env.E2E_PROJECT = "twake-contacts-e2e-${env.BUILD_TAG}".toLowerCase().replaceAll('[^a-z0-9_-]', '-')
            env.E2E_APP_IMAGE = "twake-contacts-web-e2e:${env.E2E_PROJECT}"
          }
          sh 'e2e/scripts/build.sh'
          dir('e2e') {
            sh 'npm ci'
            sh 'npm run typecheck'
            sh 'npx playwright install chromium'
            sh './scripts/start.sh'
            sh 'npx playwright test'
          }
        }
        post {
          always {
            sh 'e2e/scripts/stop.sh || true'
            sh 'docker rmi "$E2E_APP_IMAGE" "$E2E_APP_IMAGE-base" || true'
            junit allowEmptyResults: true, testResults: 'e2e/test-results/junit.xml'
            archiveArtifacts artifacts: 'e2e/playwright-report/**, e2e/test-results/artifacts/**', allowEmptyArchive: true
          }
        }
      }
      stage('Deploy docker image (PR)') {
        when {
          changeRequest()
        }
        steps {
          script {
            def dockerTag = "${env.CHANGE_ID}"
            env.DOCKER_TAG = dockerTag
            echo "Docker tag: ${dockerTag}"
            def shortSha = env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'dev'
            sh 'npm run build'
            sh "docker build -f apps/private/Dockerfile --build-arg BUILD_VERSION=${shortSha} -t linagora/twake-contacts-web-pr:\$DOCKER_TAG ."
            withDockerHubLogin {
              sh 'docker push linagora/twake-contacts-web-pr:$DOCKER_TAG'
            }
            withGithubCredential {
              sh """
              HTTP_STATUS=\$(curl -s -o /tmp/gh_comment_response.json -w "%{http_code}" -X POST \\
                -H "Authorization: token \${GITHUB_CREDENTIAL_PSW}" \\
                -H "Content-Type: application/json" \\
                -d "{\\"body\\": \\"Docker image published for this PR:\\n- Private: linagora/twake-contacts-web-pr:${dockerTag}\\"}" \\
                "https://api.github.com/repos/linagora/twake-contacts-frontend/issues/\${CHANGE_ID}/comments")
              if [ "\$HTTP_STATUS" -lt 200 ] || [ "\$HTTP_STATUS" -ge 300 ]; then
                echo "WARNING: GitHub API comment failed with HTTP \$HTTP_STATUS"
                cat /tmp/gh_comment_response.json
              fi
              """
            }
          }
        }
      }
      stage('Deploy docker images') {
        when {
          anyOf {
            branch 'main'
            buildingTag()
          }
        }
        steps {
          // TODO(contacts): no Vault secrets yet, so Sentry sourcemaps are not uploaded.
          // Wrap this in withVault([... 'secret/jenkins/contacts-frontend' ...]) exporting
          // SENTRY_AUTH_TOKEN/ORG/PROJECT/URL once the path exists, as twake-calendar-frontend does.
          // The release is already named after BUILD_VERSION (SENTRY_RELEASE) on both sides.
          script {
            // Immutable tags: X.Y.Z for a release tag vX.Y.Z, sha-<8> for every main build.
            // branch-master stays as a moving pointer to the latest main build, never deploy it.
            def dockerTags
            if (env.TAG_NAME) {
              env.BUILD_VERSION = env.TAG_NAME.replaceFirst('^v', '')
              dockerTags = [env.BUILD_VERSION]
            } else {
              env.BUILD_VERSION = "sha-${env.GIT_COMMIT.take(8)}"
              dockerTags = [env.BUILD_VERSION, 'branch-master']
            }
            // Read by common/sentryBuildUtils.ts to name the Sentry release of the source maps
            env.SENTRY_RELEASE = env.BUILD_VERSION

            echo "Build version: ${env.BUILD_VERSION}, docker tags: ${dockerTags}"
            sh 'npm run build'
            sh 'docker build -f apps/private/Dockerfile --build-arg BUILD_VERSION=$BUILD_VERSION -t linagora/twake-contacts-web:$BUILD_VERSION .'
            dockerTags.each { tag ->
              sh "docker tag linagora/twake-contacts-web:\$BUILD_VERSION linagora/twake-contacts-web:${tag}"
            }
            withDockerHubLogin {
              dockerTags.each { tag ->
                sh "docker push linagora/twake-contacts-web:${tag}"
              }
            }
          }
        }
      }
    }
    post {
        always {
            deleteDir() /* clean up our workspace */
        }
    }
}

// A fork pull request is built only when its owner is a linagora member, or when a member reviewed
// its head commit. GitHub ties the review to that commit (commit_id), so a commit pushed after the
// approval is not built until a member reviews it again.
def authorizeFork() {
  withGithubCredential {
    def forkOwner = env.CHANGE_FORK
    if (isOrgMember(forkOwner)) {
      echo "Fork owner '${forkOwner}' is a linagora org member, proceeding."
      return
    }
    def headSha = checkedOutPullRequestHead()
    def approver = memberReviewerOf(headSha)
    if (approver) {
      echo "Commit ${headSha} approved by linagora member '${approver}', proceeding."
      return
    }
    error("Fork owner '${forkOwner}' is not a linagora org member and no member reviewed commit ${headSha}. " +
      "A linagora member must approve the pull request, or submit a review 'Build this please', " +
      "on this commit, then re-run the build.")
  }
}

// The head commit of the pull request, checked against the sources Jenkins checked out: HEAD itself,
// or the second parent of the merge commit Jenkins builds with the target branch
def checkedOutPullRequestHead() {
  def headSha = githubApi("pulls/${env.CHANGE_ID}").head.sha
  def checkedOut = sh(script: 'git rev-parse HEAD; git rev-parse -q --verify "HEAD^2" || true', returnStdout: true)
    .trim().tokenize('\n')
  if (!checkedOut.contains(headSha)) {
    error("The pull request head moved to ${headSha} since the checkout of ${checkedOut}: re-run the build.")
  }
  return headSha
}

// The login of a linagora member who approved the given commit, or reviewed it with 'Build this please'
def memberReviewerOf(String sha) {
  def reviews = githubApi("pulls/${env.CHANGE_ID}/reviews?per_page=100")
  for (review in reviews) {
    def approves = review.state == 'APPROVED' ||
      (review.state != 'DISMISSED' && "${review.body}".trim() == 'Build this please')
    if (review.commit_id == sha && approves && isOrgMember(review.user.login)) {
      return review.user.login
    }
  }
  return null
}

def isOrgMember(String login) {
  def status
  withEnv(["GITHUB_LOGIN=${login}"]) {
    status = sh(
      script: 'curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_CREDENTIAL_PSW" ' +
        '"https://api.github.com/orgs/linagora/members/$GITHUB_LOGIN"',
      returnStdout: true
    ).trim()
  }
  echo "GitHub org membership check returned HTTP ${status} for '${login}'"
  if (status == '204') {
    return true
  }
  if (status == '404') {
    return false
  }
  error("GitHub API error ${status} while checking the membership of '${login}'")
}

def githubApi(String path) {
  def json
  withEnv(["GITHUB_API_PATH=${path}"]) {
    json = sh(
      script: 'curl -sf -H "Authorization: token $GITHUB_CREDENTIAL_PSW" ' +
        '"https://api.github.com/repos/linagora/twake-contacts-frontend/$GITHUB_API_PATH"',
      returnStdout: true
    )
  }
  return readJSON(text: json)
}

// Binds the GitHub token as GITHUB_CREDENTIAL_USR / GITHUB_CREDENTIAL_PSW around the given steps only
def withGithubCredential(Closure body) {
  withCredentials([usernamePassword(credentialsId: 'github',
      usernameVariable: 'GITHUB_CREDENTIAL_USR', passwordVariable: 'GITHUB_CREDENTIAL_PSW')]) {
    body()
  }
}

// Logs in Docker Hub in a throwaway Docker config deleted afterwards, so that the credential never
// stays on the agent where a later build could read it
def withDockerHubLogin(Closure body) {
  withEnv(["DOCKER_CONFIG=${pwd(tmp: true)}/docker-config"]) {
    try {
      withCredentials([usernamePassword(credentialsId: 'dockerHub',
          usernameVariable: 'DOCKER_HUB_CREDENTIAL_USR', passwordVariable: 'DOCKER_HUB_CREDENTIAL_PSW')]) {
        sh 'mkdir -p "$DOCKER_CONFIG" && echo "$DOCKER_HUB_CREDENTIAL_PSW" | docker login -u "$DOCKER_HUB_CREDENTIAL_USR" --password-stdin'
      }
      body()
    } finally {
      sh 'docker logout || true; rm -rf "$DOCKER_CONFIG"'
    }
  }
}
