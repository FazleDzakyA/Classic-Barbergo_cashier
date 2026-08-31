<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Barber;
use App\Models\Service;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Users
        if (User::count() === 0) {
            User::create([
                'id' => 1,
                'username' => 'admin',
                'passwordHash' => '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
                'role' => 'admin',
                'name' => 'Admin BB go',
                'isActive' => true,
                'createdAt' => '2026-07-24T00:00:00.000Z',
            ]);

            User::create([
                'id' => 2,
                'username' => 'kasir',
                'passwordHash' => 'f02b7c1e519e4fa436147f7e1399974f9510aa9c8e0cb8be29151eb540f9d214',
                'role' => 'cashier',
                'name' => 'Kasir BB Go',
                'isActive' => true,
                'createdAt' => '2026-07-24T00:00:00.000Z',
            ]);
        }

        // 2. Seed Barbers
        if (Barber::count() === 0) {
            Barber::create([
                'id' => 1,
                'name' => 'Faiz',
                'phone' => '+62 812 1856 7781',
                'address' => 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
                'shift' => 'Pagi',
                'isActive' => true,
                'joinedDate' => '2026-07-24',
            ]);

            Barber::create([
                'id' => 2,
                'name' => 'Fadli',
                'phone' => '+62 823-2213-9938',
                'address' => 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
                'shift' => 'Siang',
                'isActive' => true,
                'joinedDate' => '2026-07-24',
            ]);

            Barber::create([
                'id' => 3,
                'name' => 'Rizki',
                'phone' => '+62 882 0038 74460',
                'address' => 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
                'shift' => 'Malam',
                'isActive' => true,
                'joinedDate' => '2026-07-24',
            ]);
        }

        // 3. Seed Services
        if (Service::count() === 0) {
            $servicesData = [
                ['id' => 1, 'name' => 'Potong', 'category' => 'Haircut', 'price' => 20000, 'duration' => 30, 'labelColor' => '#D4AF37', 'isActive' => true, 'stock' => null, 'image' => 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'],
                ['id' => 2, 'name' => 'Potong Kramas', 'category' => 'Haircut', 'price' => 23000, 'duration' => 40, 'labelColor' => '#4169E1', 'isActive' => true, 'stock' => null, 'image' => 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'],
                ['id' => 3, 'name' => 'Shaving', 'category' => 'Treatment', 'price' => 10000, 'duration' => 15, 'labelColor' => '#20B2AA', 'isActive' => true, 'stock' => null, 'image' => '/images/service_shaving.jpg'],
                ['id' => 4, 'name' => 'Hair Color Mulai', 'category' => 'Hair Color', 'price' => 70000, 'duration' => 60, 'labelColor' => '#FF69B4', 'isActive' => true, 'stock' => null, 'image' => '/images/service_haircolor.jpg'],
                ['id' => 5, 'name' => 'Highlight Mulai', 'category' => 'Hair Color', 'price' => 80000, 'duration' => 60, 'labelColor' => '#BA55D3', 'isActive' => true, 'stock' => null, 'image' => '/images/service_highlight.jpg'],
                ['id' => 6, 'name' => 'Semir Hitam', 'category' => 'Hair Color', 'price' => 60000, 'duration' => 45, 'labelColor' => '#778899', 'isActive' => true, 'stock' => null, 'image' => '/images/service_semirhitam.jpg'],
                ['id' => 7, 'name' => 'Hair Tonic', 'category' => 'Treatment', 'price' => 25000, 'duration' => 10, 'labelColor' => '#3CB371', 'isActive' => true, 'stock' => null, 'image' => '/images/service_hairtonic.jpg'],
                ['id' => 8, 'name' => 'Hair Tonic Besar', 'category' => 'Treatment', 'price' => 30000, 'duration' => 15, 'labelColor' => '#2E8B57', 'isActive' => true, 'stock' => null, 'image' => '/images/service_hairtonic.jpg'],
                ['id' => 9, 'name' => 'Pomade', 'category' => 'Product', 'price' => 25000, 'duration' => 5, 'labelColor' => '#CD853F', 'isActive' => true, 'stock' => 25, 'image' => '/images/service_pomade.jpg'],
                ['id' => 10, 'name' => 'Creambath', 'category' => 'Treatment', 'price' => 50000, 'duration' => 45, 'labelColor' => '#FF8C00', 'isActive' => true, 'stock' => null, 'image' => '/images/service_creambath.jpg'],
                ['id' => 11, 'name' => 'Smoting', 'category' => 'Treatment', 'price' => 60000, 'duration' => 90, 'labelColor' => '#4682B4', 'isActive' => true, 'stock' => null, 'image' => '/images/service_smoothing.jpg'],
            ];

            foreach ($servicesData as $s) {
                Service::create($s);
            }
        }

        // 4. Seed Settings
        if (Setting::count() === 0) {
            Setting::create([
                'key_name' => 'app_settings',
                'logo' => 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 12h6"/></svg>',
                'name' => 'BarberFlow Premium',
                'address' => 'Jl. Mr. Koesbiyono Tjondrowibowo Jl. Raya Muntal, Patemon, Kec. Gn. Pati, Kota Semarang, Jawa Tengah 50228',
                'phone' => '0812-3456-7890',
                'receiptFooter' => "Terima kasih atas kunjungan Anda!\nBarberFlow - Premium Grooming Experience",
                'defaultTax' => 0,
                'currency' => 'Rp',
            ]);
        }
    }
}
