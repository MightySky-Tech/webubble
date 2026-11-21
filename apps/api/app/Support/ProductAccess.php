<?php

namespace App\Support;

use App\Models\Role;
use App\Models\SellerProfile;
use Illuminate\Http\Request;

class ProductAccess
{
    public static function sellerProfile(Request $request): SellerProfile
    {
        $profile = $request->user()?->sellerProfile;
        abort_unless(
            $profile?->status === SellerProfile::STATUS_APPROVED
            && $request->user()->roles()->whereIn('name', [Role::SELLER, Role::VENDOR])->exists(),
            403,
            'An approved seller account is required.',
        );

        return $profile;
    }

    public static function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->roles()->where('name', Role::ADMIN)->exists()
            && in_array('admin:verified', $request->user()->currentAccessToken()?->abilities ?? [], true),
            403,
            'Administrator access with completed MFA is required.',
        );
    }
}
