#!/bin/bash
# Génère un fichier CSV de test avec plus de 200 000 lignes
# Usage: ./generate-large-csv.sh [nombre_lignes]

LINES=${1:-210000}
OUTPUT="test-large-${LINES}.csv"

echo "Génération de $LINES lignes dans $OUTPUT..."

# En-tête
echo "Date;Heure;Montant;Machine;Programme;Mode_Paiement" > "$OUTPUT"

# Générer les lignes
for i in $(seq 1 $LINES); do
  # Date aléatoire en 2024
  MONTH=$(printf "%02d" $((RANDOM % 12 + 1)))
  DAY=$(printf "%02d" $((RANDOM % 28 + 1)))
  HOUR=$(printf "%02d" $((RANDOM % 24)))
  MIN=$(printf "%02d" $((RANDOM % 60)))
  
  # Montant entre 2.00 et 8.00
  AMOUNT="$((RANDOM % 6 + 2)).$((RANDOM % 100))"
  
  # Machine aléatoire
  MACHINES=("LL-01" "LL-02" "LL-03" "SL-01" "SL-02")
  MACHINE=${MACHINES[$((RANDOM % ${#MACHINES[@]}))]}
  
  # Programme
  PROGRAMS=("Lavage 30°" "Lavage 40°" "Lavage 60°" "Séchage 30min" "Séchage 45min")
  PROGRAM=${PROGRAMS[$((RANDOM % ${#PROGRAMS[@]}))]}
  
  # Mode de paiement
  PAYMENTS=("CB" "Espèces" "Carte Fidélité" "Mobile")
  PAYMENT=${PAYMENTS[$((RANDOM % ${#PAYMENTS[@]}))]}
  
  echo "2024-${MONTH}-${DAY};${HOUR}:${MIN}:00;${AMOUNT};${MACHINE};${PROGRAM};${PAYMENT}" >> "$OUTPUT"
  
  # Progress
  if [ $((i % 50000)) -eq 0 ]; then
    echo "  $i / $LINES lignes générées..."
  fi
done

SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "✓ Fichier généré : $OUTPUT ($SIZE)"
