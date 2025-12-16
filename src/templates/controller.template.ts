export function controllerTemplate(solution: string, entity: string): string {

    return `
using Microsoft.AspNetCore.Mvc;
using ${solution}.Application.DTOs.${entity}s;
using ${solution}.Application.Interfaces.Services;

namespace ${solution}.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class ${entity}Controller : ControllerBase
    {
        private readonly I${entity}Service _service;

        public ${entity}Controller(I${entity}Service service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Create${entity}Dto dto)
            => Ok(await _service.CreateAsync(dto));

        [HttpPut]
        public async Task<IActionResult> Update(Update${entity}Dto dto)
        {
            await _service.UpdateAsync(dto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
`.trim();
}
