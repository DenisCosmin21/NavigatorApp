
package com.navigatorapp

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.sqrt

class MotionModule(
    private val context: ReactApplicationContext
) : ReactContextBaseJavaModule(context), SensorEventListener, LifecycleEventListener {

    private val sensorManager =
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager

    private val motionSensor =
        sensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    private val gyroSensor =
        sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

    private val orientationSensor =
        sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)

    private val usesLinearAcceleration =
        motionSensor?.type == Sensor.TYPE_LINEAR_ACCELERATION

    private val gravity = FloatArray(3)
    private var gravityInitialized = false
    private var listenerCount = 0
    private var registered = false
    private var lastMotionTimestamp = 0L
    private var lastGyroTimestamp = 0L
    private var lastOrientationTimestamp = 0L

    init {
        context.addLifecycleEventListener(this)
    }

    override fun getName(): String = "MotionModule"

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(motionSensor != null)
    }

    @ReactMethod
    fun getSensorAvailability(promise: Promise) {
        val result = Arguments.createMap().apply {
            putBoolean("accelerometer", motionSensor != null)
            putBoolean("gyroscope", gyroSensor != null)
            putBoolean("orientation", orientationSensor != null)
        }

        promise.resolve(result)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        if (eventName !in listOf(
                "MotionUpdate",
                "GyroscopeUpdate",
                "OrientationUpdate"
            )
        ) {
            return
        }

        listenerCount++

        if (listenerCount == 1) {
            startSensors()
        }
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount = (listenerCount - count).coerceAtLeast(0)

        if (listenerCount == 0) {
            stopSensors()
        }
    }

    private fun startSensors() {
        if (registered) return

        registered = true

        motionSensor?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_UI
            )
        }

        gyroSensor?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_UI
            )
        }

        orientationSensor?.let {
            sensorManager.registerListener(
                this,
                it,
                SensorManager.SENSOR_DELAY_UI
            )
        }
    }

    private fun stopSensors() {
        sensorManager.unregisterListener(this)
        registered = false
    }

    private fun emit(
        name: String,
        data: com.facebook.react.bridge.WritableMap
    ) {
        context.getJSModule(
            DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
        ).emit(name, data)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (!registered) return

        when (event.sensor.type) {
            Sensor.TYPE_LINEAR_ACCELERATION,
            Sensor.TYPE_ACCELEROMETER -> {
                if (
                    event.timestamp - lastMotionTimestamp <
                    250_000_000L
                ) {
                    return
                }

                lastMotionTimestamp = event.timestamp

                var x = event.values[0]
                var y = event.values[1]
                var z = event.values[2]

                if (!usesLinearAcceleration) {
                    if (!gravityInitialized) {
                        gravity[0] = x
                        gravity[1] = y
                        gravity[2] = z
                        gravityInitialized = true
                        return
                    }

                    val alpha = 0.8f

                    gravity[0] =
                        alpha * gravity[0] + (1 - alpha) * x
                    gravity[1] =
                        alpha * gravity[1] + (1 - alpha) * y
                    gravity[2] =
                        alpha * gravity[2] + (1 - alpha) * z

                    x -= gravity[0]
                    y -= gravity[1]
                    z -= gravity[2]
                }

                val magnitude =
                    sqrt(x * x + y * y + z * z)

                emit(
                    "MotionUpdate",
                    Arguments.createMap().apply {
                        putDouble(
                            "magnitude",
                            magnitude.toDouble()
                        )
                    }
                )
            }

            Sensor.TYPE_GYROSCOPE -> {
                if (
                    event.timestamp - lastGyroTimestamp <
                    200_000_000L
                ) {
                    return
                }

                lastGyroTimestamp = event.timestamp

                val x = event.values[0]
                val y = event.values[1]
                val z = event.values[2]

                val magnitude =
                    sqrt(x * x + y * y + z * z)

                emit(
                    "GyroscopeUpdate",
                    Arguments.createMap().apply {
                        putDouble(
                            "magnitude",
                            magnitude.toDouble()
                        )
                    }
                )
            }

            Sensor.TYPE_ROTATION_VECTOR -> {
                if (
                    event.timestamp - lastOrientationTimestamp <
                    200_000_000L
                ) {
                    return
                }

                lastOrientationTimestamp = event.timestamp

                val rotationMatrix = FloatArray(9)
                val angles = FloatArray(3)

                SensorManager.getRotationMatrixFromVector(
                    rotationMatrix,
                    event.values
                )

                SensorManager.getOrientation(
                    rotationMatrix,
                    angles
                )

                val heading =
                    (Math.toDegrees(angles[0].toDouble()) +
                            360.0) % 360.0

                emit(
                    "OrientationUpdate",
                    Arguments.createMap().apply {
                        putDouble("heading", heading)
                    }
                )
            }
        }
    }

    override fun onAccuracyChanged(
        sensor: Sensor?,
        accuracy: Int
    ) = Unit

    override fun onHostResume() {
        if (listenerCount > 0) {
            startSensors()
        }
    }

    override fun onHostPause() {
        stopSensors()
    }

    override fun onHostDestroy() {
        stopSensors()
    }
}
