
import {useEffect, useRef, useState} from 'react';
import {DeviceMotion} from 'expo-sensors';
import * as Location from 'expo-location';

const ACCELERATION_THRESHOLD = 0.8;
const ROTATION_THRESHOLD = 10;

export function useMotionSensors() {
  const [accelerating, setAccelerating] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);

  const accelerationTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const rotationTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  useEffect(() => {
    let active = true;

    let motionSubscription:
      | {remove: () => void}
      | null = null;

    let headingSubscription:
      | Location.LocationSubscription
      | null = null;

    const showAcceleration = () => {
      setAccelerating(true);

      if (accelerationTimer.current) {
        clearTimeout(accelerationTimer.current);
      }

      accelerationTimer.current = setTimeout(() => {
        if (active) {
          setAccelerating(false);
        }
      }, 1200);
    };

    const showRotation = () => {
      setRotating(true);

      if (rotationTimer.current) {
        clearTimeout(rotationTimer.current);
      }

      rotationTimer.current = setTimeout(() => {
        if (active) {
          setRotating(false);
        }
      }, 900);
    };

    const startSensors = async () => {
      try {
        const available =
          await DeviceMotion.isAvailableAsync();

        if (!active) {
          return;
        }

        if (available) {
          DeviceMotion.setUpdateInterval(200);

          motionSubscription =
            DeviceMotion.addListener(event => {
              if (!active) {
                return;
              }

              const acceleration = event.acceleration;

              if (acceleration) {
                const magnitude = Math.hypot(
                  acceleration.x ?? 0,
                  acceleration.y ?? 0,
                  acceleration.z ?? 0,
                );

                if (magnitude >= ACCELERATION_THRESHOLD) {
                  showAcceleration();
                }
              }

              const rate = event.rotationRate;

              if (rate) {
                const magnitude = Math.hypot(
                  rate.alpha ?? 0,
                  rate.beta ?? 0,
                  rate.gamma ?? 0,
                );

                if (magnitude >= ROTATION_THRESHOLD) {
                  showRotation();
                }
              }
            });
        }
      } catch (error) {
        console.warn('DeviceMotion unavailable:', error);
      }

      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (!active || !permission.granted) {
          return;
        }

        const subscription =
          await Location.watchHeadingAsync(value => {
            if (!active) {
              return;
            }

            const degrees =
              value.trueHeading >= 0
                ? value.trueHeading
                : value.magHeading;

            if (Number.isFinite(degrees) && degrees >= 0) {
              setHeading((degrees + 360) % 360);
            }
          });

        if (active) {
          headingSubscription = subscription;
        } else {
          subscription.remove();
        }
      } catch (error) {
        console.warn('Compass unavailable:', error);
      }
    };

    void startSensors();

    return () => {
      active = false;

      motionSubscription?.remove();
      headingSubscription?.remove();

      if (accelerationTimer.current) {
        clearTimeout(accelerationTimer.current);
      }

      if (rotationTimer.current) {
        clearTimeout(rotationTimer.current);
      }
    };
  }, []);

  return {
    accelerating,
    rotating,
    heading,
  };
}
