import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const token = request.headers.get('x-device-token');

    if (!process.env.DEVICE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Server DEVICE_API_TOKEN missing.' },
        { status: 500 }
      );
    }

    if (token !== process.env.DEVICE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized device token.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const deviceId = String(body.deviceId || '').trim();
    const vehicleName = String(body.vehicleName || 'GPS Device').trim();

    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, error: 'Valid lat and lng are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const locationData = {
      deviceId,
      vehicleName,
      lat,
      lng,
      accuracy: body.accuracy ?? null,
      speed: body.speed ?? null,
      heading: body.heading ?? null,
      batteryLevel: body.batteryLevel ?? null,
      charging: body.charging ?? null,
      status: 'online',
      source: 'gps-device-api',
      updatedAt: now,
      lastSeenAt: now,
    };

    await adminDb.collection('deviceLocations').doc(deviceId).set(
      {
        ...locationData,
        createdAt: body.createdAt || now,
      },
      { merge: true }
    );

    await adminDb
      .collection('deviceLocations')
      .doc(deviceId)
      .collection('history')
      .add(locationData);

    return NextResponse.json({
      success: true,
      message: 'Device location saved.',
      deviceId,
      updatedAt: now,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Server error.',
      },
      { status: 500 }
    );
  }
}
