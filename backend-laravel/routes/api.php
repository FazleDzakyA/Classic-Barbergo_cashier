<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarberController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\ReviewController;

use App\Http\Controllers\Api\ShiftReportController;

// 1. Auth API
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::get('/users', [AuthController::class, 'index']);
Route::put('/users/{id}', [AuthController::class, 'update']);

// 2. Barber API
Route::apiResource('/barbers', BarberController::class);

// 3. Service API
Route::apiResource('/services', ServiceController::class);

// 4. Session (Shift) API
Route::get('/sessions', [SessionController::class, 'index']);
Route::get('/sessions/active', [SessionController::class, 'active']);
Route::post('/sessions/open', [SessionController::class, 'open']);
Route::post('/sessions/close', [SessionController::class, 'close']);

// 5. Transaction API
Route::get('/transactions', [TransactionController::class, 'index']);
Route::post('/transactions', [TransactionController::class, 'store']);
Route::put('/transactions/{id}', [TransactionController::class, 'update']);
Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);

// 6. Expense API
Route::apiResource('/expenses', ExpenseController::class);

// 7. Shift Reports API
Route::get('/shift-reports', [ShiftReportController::class, 'index']);
Route::post('/shift-reports', [ShiftReportController::class, 'store']);
Route::put('/shift-reports/{id}/verify', [ShiftReportController::class, 'verify']);

// 8. Setting API
Route::get('/settings', [SettingController::class, 'index']);
Route::put('/settings', [SettingController::class, 'update']);

// 9. Database API
Route::post('/database/reset', [DatabaseController::class, 'reset']);
Route::post('/database/import', [DatabaseController::class, 'import']);

// 10. Review API
Route::apiResource('/reviews', ReviewController::class);
