using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtendTimeLogAndSubTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SubTaskId",
                table: "TimeLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedHours",
                table: "SubTasks",
                type: "numeric",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimeLogs_SubTaskId",
                table: "TimeLogs",
                column: "SubTaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeLogs_SubTasks_SubTaskId",
                table: "TimeLogs",
                column: "SubTaskId",
                principalTable: "SubTasks",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeLogs_SubTasks_SubTaskId",
                table: "TimeLogs");

            migrationBuilder.DropIndex(
                name: "IX_TimeLogs_SubTaskId",
                table: "TimeLogs");

            migrationBuilder.DropColumn(
                name: "SubTaskId",
                table: "TimeLogs");

            migrationBuilder.DropColumn(
                name: "EstimatedHours",
                table: "SubTasks");
        }
    }
}
