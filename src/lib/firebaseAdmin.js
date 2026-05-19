import admin from 'firebase-admin';

function getServiceAccount() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!base64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is missing.');
  }

  const cleanBase64 = base64.trim();
  const jsonText = Buffer.from(cleanBase64, 'base64').toString('utf8').replace(/^\uFEFF/, '');
  const raw = JSON.parse(jsonText);

  if (!raw.project_id || !raw.client_email || !raw.private_key) {
    throw new Error('Invalid service account JSON. Missing project_id, client_email, or private_key.');
  }

  return {
    projectId: raw.project_id,
    clientEmail: raw.client_email,
    privateKey: raw.private_key,
  };
}

export function getAdminDb() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}