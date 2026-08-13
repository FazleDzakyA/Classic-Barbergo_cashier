<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $setting = Setting::where('key_name', 'app_settings')->first();
        if (!$setting) {
            return response()->json(null);
        }

        return response()->json([
            'key' => $setting->key_name,
            'logo' => $setting->logo,
            'name' => $setting->name,
            'address' => $setting->address,
            'phone' => $setting->phone,
            'receiptFooter' => $setting->receiptFooter,
            'defaultTax' => $setting->defaultTax,
            'currency' => $setting->currency,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'logo' => 'nullable|string',
            'name' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'receiptFooter' => 'nullable|string',
            'defaultTax' => 'nullable|integer',
            'currency' => 'nullable|string',
        ]);

        $setting = Setting::where('key_name', 'app_settings')->first();
        if (!$setting) {
            $setting = Setting::create(array_merge(['key_name' => 'app_settings'], $data));
        } else {
            $setting->update($data);
        }

        return response()->json([
            'key' => 'app_settings',
            'logo' => $setting->logo,
            'name' => $setting->name,
            'address' => $setting->address,
            'phone' => $setting->phone,
            'receiptFooter' => $setting->receiptFooter,
            'defaultTax' => $setting->defaultTax,
            'currency' => $setting->currency,
        ]);
    }
}
