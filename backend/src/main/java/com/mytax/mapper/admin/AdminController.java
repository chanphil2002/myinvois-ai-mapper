package com.mytax.mapper.admin;

import com.mytax.mapper.admin.AdminDtos.*;
import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Admin console API — every route requires role ADMIN (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/overview")
    public ApiResponse<Overview> overview() {
        return ApiResponse.ok(adminService.overview());
    }

    @GetMapping("/users")
    public ApiResponse<List<UserRow>> users(@RequestParam(required = false) String q) {
        return ApiResponse.ok(adminService.users(q));
    }

    @PatchMapping("/users/{id}")
    public ApiResponse<Void> updateUser(@PathVariable Long id, @RequestBody UpdateUser request) {
        adminService.updateUser(CurrentUser.id(), id, request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/salespersons")
    public ApiResponse<List<SalespersonRow>> salespeople() {
        return ApiResponse.ok(adminService.salespeople());
    }

    @PostMapping("/salespersons")
    public ApiResponse<Map<String, Long>> createSalesperson(@RequestBody SaveSalesperson request) {
        return ApiResponse.ok(Map.of("id", adminService.saveSalesperson(null, request)));
    }

    @PatchMapping("/salespersons/{id}")
    public ApiResponse<Map<String, Long>> updateSalesperson(@PathVariable Long id, @RequestBody SaveSalesperson request) {
        return ApiResponse.ok(Map.of("id", adminService.saveSalesperson(id, request)));
    }

    @GetMapping("/referral-codes")
    public ApiResponse<List<CodeRow>> codes() {
        return ApiResponse.ok(adminService.codes());
    }

    @PostMapping("/referral-codes")
    public ApiResponse<Map<String, String>> createCode(@RequestBody CreateCode request) {
        return ApiResponse.ok(Map.of("code", adminService.createCode(request)));
    }

    @PatchMapping("/referral-codes/{id}")
    public ApiResponse<Void> updateCode(@PathVariable Long id, @RequestBody UpdateCode request) {
        adminService.updateCode(id, request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/commissions")
    public ApiResponse<List<CommissionRow>> commissions(@RequestParam(required = false) String status) {
        return ApiResponse.ok(adminService.commissions(status));
    }

    @PostMapping("/commissions/{id}/pay")
    public ApiResponse<Void> markPaid(@PathVariable Long id) {
        adminService.markCommissionPaid(id);
        return ApiResponse.ok(null);
    }
}
