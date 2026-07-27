// MÁSCARAS DE INPUT
// ═══════════════════════════════════════════════
// BUGFIX: antes, o campo de salário tinha DOIS listeners de 'input' — o
// oninput inline (salvar + recalcular) e este de máscara — registrados em
// momentos diferentes. Isso fazia o "salvar/recalcular" rodar ANTES da
// máscara reformatar o valor, então o número salvo/usado no cálculo ficava
// sempre um dígito atrasado em relação ao que aparecia na tela (parecia
// "travar" e não gravar o salário certo). Agora a máscara aplica o
// formato primeiro e só then dispara o callback (onAfter), na ordem certa.
function aplicarMascaraDinheiro(elemento, onAfter) {
  elemento.addEventListener('input', function () {
    let v = this.value.replace(/[^0-9]/g, '');
    this.value = v ? (parseInt(v, 10) / 100).toFixed(2).replace('.', ',') : '';
    if (typeof onAfter === 'function') onAfter();
  });
}

aplicarMascaraDinheiro(document.getElementById('fValor'));
aplicarMascaraDinheiro(document.getElementById('simSalario'), () => {
  saveSimInputs();
  calcularSimulacao();
});

// ═══════════════════════════════════════════════
