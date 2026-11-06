
package com.navigatorapp

import android.content.pm.PackageManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.android.libraries.places.api.net.PlacesClient

class PlacesModule(
    private val context: ReactApplicationContext
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "PlacesModule"

    private val placesClient: PlacesClient by lazy {
        if (!Places.isInitialized()) {
            val appInfo = context.packageManager.getApplicationInfo(
                context.packageName,
                PackageManager.GET_META_DATA
            )

            val apiKey = appInfo.metaData?.getString(
                "com.google.android.geo.API_KEY"
            ) ?: throw IllegalStateException(
                "Google Maps API key not found"
            )

            Places.initializeWithNewPlacesApiEnabled(
                context,
                apiKey
            )
        }

        Places.createClient(context)
    }

    @ReactMethod
    fun searchPlaces(query: String, promise: Promise) {
        if (query.trim().length < 2) {
            promise.resolve(Arguments.createArray())
            return
        }

        try {
            val request = FindAutocompletePredictionsRequest.builder()
                .setQuery(query.trim())
                .build()

            placesClient.findAutocompletePredictions(request)
                .addOnSuccessListener { response ->
                    val results = Arguments.createArray()

                    response.autocompletePredictions.forEach { prediction ->
                        val place = Arguments.createMap()

                        place.putString(
                            "id",
                            prediction.placeId
                        )

                        place.putString(
                            "name",
                            prediction.getFullText(null).toString()
                        )

                        results.pushMap(place)
                    }

                    promise.resolve(results)
                }
                .addOnFailureListener { error ->
                    promise.reject(
                        "PLACES_SEARCH_ERROR",
                        error.message,
                        error
                    )
                }

        } catch (error: Exception) {
            promise.reject(
                "PLACES_INITIALIZATION_ERROR",
                error.message,
                error
            )
        }
    }

    @ReactMethod
    fun getPlaceDetails(placeId: String, promise: Promise) {
        try {
            val fields = listOf(
                Place.Field.ID,
                Place.Field.DISPLAY_NAME,
                Place.Field.LOCATION
            )

            val request = FetchPlaceRequest.builder(
                placeId,
                fields
            ).build()

            placesClient.fetchPlace(request)
                .addOnSuccessListener { response ->
                    val place = response.place
                    val location = place.location

                    if (location == null) {
                        promise.reject(
                            "LOCATION_ERROR",
                            "Location not found"
                        )
                        return@addOnSuccessListener
                    }

                    val result = Arguments.createMap()

                    result.putString(
                        "id",
                        place.id
                    )

                    result.putString(
                        "name",
                        place.displayName ?: "Destination"
                    )

                    result.putDouble(
                        "latitude",
                        location.latitude
                    )

                    result.putDouble(
                        "longitude",
                        location.longitude
                    )

                    promise.resolve(result)
                }
                .addOnFailureListener { error ->
                    promise.reject(
                        "PLACE_DETAILS_ERROR",
                        error.message,
                        error
                    )
                }

        } catch (error: Exception) {
            promise.reject(
                "PLACE_DETAILS_ERROR",
                error.message,
                error
            )
        }
    }
}
