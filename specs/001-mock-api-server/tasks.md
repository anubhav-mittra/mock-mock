# Tasks: Mock API Server

**Feature Branch**: `001-mock-api-server`  
**Created**: 2026-02-11  
**Status**: Draft  

## Phase 1: Backend Setup

- [x] T001 Initialize backend project structure in `server/`
- [x] T002 Create `package.json` and install dependencies: `express`, `firebase-admin`, `js-yaml`, `@redocly/openapi-sampler`
- [x] T003 [P] Implement Spec Parser module in `server/src/services/spec-parser.js`
- [x] T004 [P] Implement Sample Generator module in `server/src/services/sample-generator.js`
- [x] T005 [P] Implement Firestore Integration module in `server/src/services/firestore.js`
- [x] T006 [P] Implement Request Handlers for GET, POST, PUT, PATCH, DELETE in `server/src/handlers/request-handlers.js`
- [x] T007 Add logging middleware in `server/src/middleware/logging.js`
- [x] T008 Add error handling middleware in `server/src/middleware/error-handler.js`
- [x] T009 Add CORS configuration in `server/src/middleware/cors.js`
- [x] T010 Create `.env` file for Firebase credentials and server configuration
- [x] T011 Create default persistent paths configuration file in `server/src/config/persistent-paths.json`
- [x] T012 Write unit tests for Spec Parser module in `server/tests/spec-parser.test.js`
- [x] T013 Write unit tests for Sample Generator module in `server/tests/sample-generator.test.js`
- [x] T014 Write integration tests for endpoints in `server/tests/endpoints.test.js`

## Phase 2: Frontend Setup

- [ ] T015 Initialize frontend project structure in `ui/`
- [ ] T016 Create `package.json` and install dependencies: `react`, `axios`, `websocket`
- [ ] T017 [P] Implement Dashboard to display endpoints in `ui/src/pages/Dashboard.jsx`
- [ ] T018 [P] Implement toggle persistence feature in `ui/src/components/TogglePersistence.jsx`
- [ ] T019 [P] Implement real-time request logs viewer in `ui/src/components/LogsViewer.jsx`
- [ ] T020 [P] Implement Firestore data viewer in `ui/src/components/DataViewer.jsx`
- [ ] T021 [P] Implement endpoint testing tool in `ui/src/components/EndpointTester.jsx`
- [ ] T022 Implement search/filter for endpoints in `ui/src/components/SearchFilter.jsx`
- [ ] T023 Implement request/response viewer in `ui/src/components/RequestResponseViewer.jsx`
- [ ] T024 Implement settings page for server configuration in `ui/src/pages/Settings.jsx`
- [ ] T025 Write unit tests for Dashboard in `ui/tests/Dashboard.test.js`
- [ ] T026 Write end-to-end tests for workflows in `ui/tests/e2e-tests.js`

## Phase 3: Deployment

- [ ] T027 Create `Dockerfile` for backend in `server/`
- [ ] T028 Create `Dockerfile` for frontend in `ui/`
- [ ] T029 Create `docker-compose.yml` for local development in project root
- [ ] T030 Write backend setup guide in `server/README.md`
- [ ] T031 Write frontend usage guide in `ui/README.md`
- [ ] T032 Write Docker instructions in `docs/docker-setup.md`
- [ ] T033 Validate `.env` file loading for Firebase credentials

## Phase 4: Finalization
